/**
 * change-planner — Server-side proposal generation helpers.
 *
 * Responsibility: build the repo-aware system prompt and parse any
 * PROPOSAL_JSON fenced block out of the model's reply.
 *
 * This module has NO knowledge of SSE, sessions, or the HTTP layer —
 * those concerns live in the chat event handler.
 */

import type { ChangeProposal } from "./types"

// ─── Prompt construction ──────────────────────────────────────────────────────

/**
 * A compact summary line per tree node.  We only include blobs (files) and
 * cap the list to keep the prompt token-efficient.
 */
const MAX_TREE_LINES = 300

export interface RepoContext {
  owner: string
  repoName: string
  branch: string
  /** Flat list of file paths in the repository */
  filePaths: string[]
}

/**
 * Build the system prompt that makes Demi repo-aware and capable of
 * producing structured change proposals.
 */
export function buildSystemPrompt(repo: RepoContext): string {
  const treeSample = repo.filePaths
    .slice(0, MAX_TREE_LINES)
    .join("\n")

  const truncationNote =
    repo.filePaths.length > MAX_TREE_LINES
      ? `\n… (${repo.filePaths.length - MAX_TREE_LINES} more files not shown)`
      : ""

  return `You are Demi, an AI assistant deeply integrated with the repository \
"${repo.owner}/${repo.repoName}" (branch: ${repo.branch}).

## Repository file tree
\`\`\`
${treeSample}${truncationNote}
\`\`\`

## Behaviour rules

**When the user asks you to change, add, remove, refactor, fix, or otherwise \
modify something in the repository:**

1. Reason about which files need to change based on the tree above.
2. Produce a change proposal in the following EXACT format — a fenced block \
labelled PROPOSAL_JSON containing valid JSON that matches the schema below, \
followed by a short plain-English summary for the user.

\`\`\`PROPOSAL_JSON
{
  "summary": "<one-line description of the change>",
  "reason": "<why this change is needed>",
  "files": [
    {
      "path": "<repo-relative file path>",
      "action": "create" | "modify" | "delete",
      "explanation": "<why this file is affected>",
      "symbols": ["<optional list of specific functions/components/classes to change>"]
    }
  ]
}
\`\`\`

<brief plain-English summary here>

**Important:**
- This is a PLAN ONLY.  Do not claim you have made any actual changes.
- Omit the \`symbols\` array if no specific symbols are identified.
- Include every file that would realistically need to change, not just the \
most obvious one.

**When the user asks a general question, explains something, or does NOT \
request a code change:** answer normally in plain text without the \
PROPOSAL_JSON block.`
}

// ─── Proposal extraction ──────────────────────────────────────────────────────

const PROPOSAL_FENCE_RE = /```PROPOSAL_JSON\s*([\s\S]*?)```/

/**
 * Attempt to parse a ChangeProposal from the model's full reply text.
 * Returns `null` if no PROPOSAL_JSON block is found or if it is invalid JSON.
 */
export function extractProposal(replyText: string): ChangeProposal | null {
  const match = PROPOSAL_FENCE_RE.exec(replyText)
  if (!match || !match[1]) return null

  try {
    const raw = JSON.parse(match[1].trim()) as unknown

    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as Record<string, unknown>).summary !== "string" ||
      typeof (raw as Record<string, unknown>).reason !== "string" ||
      !Array.isArray((raw as Record<string, unknown>).files)
    ) {
      return null
    }

    const proposal = raw as ChangeProposal

    // Validate each file entry minimally
    const validFiles = proposal.files.filter(
      (f) =>
        typeof f.path === "string" &&
        (f.action === "create" || f.action === "modify" || f.action === "delete") &&
        typeof f.explanation === "string",
    )

    return {
      summary: proposal.summary,
      reason: proposal.reason,
      files: validFiles,
    }
  } catch {
    return null
  }
}

/**
 * Strip the PROPOSAL_JSON fenced block from reply text so the rendered
 * Markdown doesn't show the raw JSON to the user.
 */
export function stripProposalBlock(replyText: string): string {
  return replyText.replace(PROPOSAL_FENCE_RE, "").trim()
}
