/**
 * change-planner — Structured code-change proposal types.
 *
 * These types are shared between the server (proposal generation) and the
 * client (rendering).  Do NOT import server-only modules here.
 */

export type ChangeAction = "create" | "modify" | "delete"

export interface ChangeFileEntry {
  /** Repository-relative file path, e.g. "src/components/Foo.vue" */
  path: string
  /** What kind of change is proposed for this file */
  action: ChangeAction
  /** Human-readable explanation of why this file needs to change */
  explanation: string
  /**
   * Optional list of specific symbols (functions, classes, components, etc.)
   * within the file that would need to change.
   */
  symbols?: string[]
}

export interface ChangeProposal {
  /** One-line summary of the overall change */
  summary: string
  /** Why this change is needed / what problem it solves */
  reason: string
  /** File-level plan entries */
  files: ChangeFileEntry[]
}
