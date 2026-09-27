import { auth } from "@@/lib/auth";
import { useOpenAI } from "@@/lib/openai";
import { resolveWorkspaceRepo } from "@@/server/utils/workspace-repo";
import type { ChangeProposal } from "@@/lib/change-planner/types";

type GeneratedChange = {
  path: string;
  action: "create" | "modify" | "delete";
  content?: string;
};

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const body = await readBody<{
    workspaceId?: string;
    proposal?: ChangeProposal & { request?: string };
  }>(event);

  if (!body.workspaceId) {
    throw createError({ statusCode: 400, message: "workspaceId is required" });
  }

  if (!body.proposal?.files?.length) {
    throw createError({ statusCode: 400, message: "proposal is required" });
  }

  const { owner, repo, defaultBranch, octokit } = await resolveWorkspaceRepo(
    session.user.id,
    body.workspaceId,
  );

  const proposal = body.proposal;
  const branch = `demi/${Date.now()}-${proposal.summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)}`;

  const { data: baseRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });

  const context = [];

  for (const file of proposal.files) {
    if (file.action === "create") {
      context.push({
        path: file.path,
        action: file.action,
        explanation: file.explanation,
        currentContent: null,
      });
      continue;
    }

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        ref: defaultBranch,
      });

      if (!Array.isArray(data) && data.type === "file") {
        context.push({
          path: file.path,
          action: file.action,
          explanation: file.explanation,
          currentContent: Buffer.from(data.content, "base64").toString("utf8"),
        });
      }
    } catch {
      throw createError({
        statusCode: 400,
        message: `Could not read ${file.path} from GitHub.`,
      });
    }
  }

  const openai = useOpenAI();

  const completion = await openai.chat.completions.create({
    model: useRuntimeConfig().openaiModel as string,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are Demi, an AI software engineering agent.

Generate the exact final contents for every file in the approved change proposal.

Rules:
- Return JSON only.
- Return { "changes": [...] }.
- Every change must contain path, action, and content.
- For modify, content must be the COMPLETE replacement file.
- For create, content must be the COMPLETE new file.
- For delete, omit content.
- Preserve existing behavior unless the requested change requires otherwise.
- Do not use markdown fences.
- Do not explain anything outside the JSON.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          request: proposal.request ?? proposal.summary,
          proposal,
          files: context,
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw createError({
      statusCode: 502,
      message: "Demi could not generate the approved changes.",
    });
  }

  let generated: { changes: GeneratedChange[] };

  try {
    generated = JSON.parse(raw);
  } catch {
    throw createError({
      statusCode: 502,
      message: "Demi returned invalid change data.",
    });
  }

  if (!Array.isArray(generated.changes) || !generated.changes.length) {
    throw createError({
      statusCode: 502,
      message: "Demi generated no file changes.",
    });
  }

  const proposedPaths = new Set(proposal.files.map((file) => file.path));
  const invalidChange = generated.changes.find((change) =>
    !proposedPaths.has(change.path) ||
    !["create", "modify", "delete"].includes(change.action) ||
    (change.action !== "delete" && typeof change.content !== "string")
  );

  if (invalidChange || generated.changes.length !== proposedPaths.size) {
    throw createError({
      statusCode: 502,
      message: "Demi generated changes that do not match the approved proposal.",
    });
  }

  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: baseRef.object.sha,
  });

  for (const change of generated.changes) {
    if (change.action === "delete") {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: change.path,
        ref: branch,
      });

      if (Array.isArray(data)) {
        throw createError({
          statusCode: 400,
          message: `Cannot delete ${change.path}: path is a directory.`,
        });
      }

      await octokit.repos.deleteFile({
        owner,
        repo,
        path: change.path,
        message: `Demi: ${proposal.summary}`,
        branch,
        sha: data.sha,
      });

      continue;
    }

    if (typeof change.content !== "string") {
      throw createError({
        statusCode: 502,
        message: `Demi did not generate content for ${change.path}.`,
      });
    }

    let sha: string | undefined;

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: change.path,
        ref: branch,
      });

      if (!Array.isArray(data)) sha = data.sha;
    } catch {
      sha = undefined;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: change.path,
      message: `Demi: ${proposal.summary}`,
      content: Buffer.from(change.content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    });
  }

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title: proposal.summary,
    body: [
      "## Demi",
      "",
      proposal.reason,
      "",
      "### Changes",
      ...proposal.files.map((file) => `- **${file.action}** \`${file.path}\` — ${file.explanation}`),
    ].join("\n"),
    head: branch,
    base: defaultBranch,
  });

  return {
    success: true,
    branch,
    pullRequest: {
      number: pr.number,
      url: pr.html_url,
      title: pr.title,
    },
  };
});