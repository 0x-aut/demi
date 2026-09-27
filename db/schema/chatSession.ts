import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { workspace } from "./workspace";
import { workspaceAgent } from "./workspaceAgent";

export const chatSession = pgTable("chat_session", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  userId:             text("user_id").notNull(),
  workspaceId:        uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  workspaceAgentId:   uuid("workspace_agent_id").references(() => workspaceAgent.id, { onDelete: "set null" }),
  mongoHistoryId:     text("mongo_history_id").notNull(),
  title:              text("title"),
  model:              text("model").notNull().default("gpt-4o"),
  totalTokens:        integer("total_tokens").default(0).notNull(),
  lastMessagePreview: text("last_message_preview"),
  status:             text("status").notNull().default("active"),
  createdAt:          timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:          timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ChatSession    = typeof chatSession.$inferSelect;
export type NewChatSession = typeof chatSession.$inferInsert;
