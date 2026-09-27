import {
  pgTable,
  text,
  uuid,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const agentCatalog = pgTable("agent_catalog", {
  id:           uuid("id").primaryKey().defaultRandom(),
  name:         text("name").notNull().unique(),
  description:  text("description").default(""),
  systemPrompt: text("system_prompt").default(""),
  model:        text("model").notNull().default("gpt-4o"),
  tools:        jsonb("tools").default([]).notNull(),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AgentCatalog    = typeof agentCatalog.$inferSelect;
export type NewAgentCatalog = typeof agentCatalog.$inferInsert;
