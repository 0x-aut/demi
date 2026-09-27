import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";
import { agentCatalog } from "./agentCatalog";

export const workspaceAgent = pgTable(
  "workspace_agent",
  {
    id:                   uuid("id").primaryKey().defaultRandom(),
    workspaceId:          uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
    agentId:              uuid("agent_id").notNull().references(() => agentCatalog.id, { onDelete: "cascade" }),
    systemPromptOverride: text("system_prompt_override"),
    modelOverride:        text("model_override"),
    toolsOverride:        jsonb("tools_override"),
    addedAt:              timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique().on(t.workspaceId, t.agentId)],
);

export type WorkspaceAgent    = typeof workspaceAgent.$inferSelect;
export type NewWorkspaceAgent = typeof workspaceAgent.$inferInsert;
