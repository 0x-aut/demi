import {
  pgTable,
  text,
  uuid,
  timestamp,
} from "drizzle-orm/pg-core";

export const workspace = pgTable("workspace", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull(),
  name:        text("name").notNull(),
  repoName:    text("repo_name").notNull(),
  repoUrl:     text("repo_url").notNull(),
  githubToken: text("github_token"),
  branch:      text("branch").notNull().default("main"),
  description: text("description"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Workspace       = typeof workspace.$inferSelect;
export type NewWorkspace    = typeof workspace.$inferInsert;
