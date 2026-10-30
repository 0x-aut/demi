import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const repository = pgTable("repository", {
  id:       uuid("id").primaryKey().defaultRandom(),
  userId:   text("user_id").notNull(),
  provider: text("provider").notNull(),
  repoId:   text("repo_id").notNull(),
  name:     text("name").notNull(),
  url:      text("url").notNull(),
  branch:   text("branch").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Repository    = typeof repository.$inferSelect;
export type NewRepository = typeof repository.$inferInsert;
