import { pgTable, uuid, text } from "drizzle-orm/pg-core";
import { workspace } from "./workspace";

export const repository = pgTable("repository", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
});

export type Repository = typeof repository.$inferSelect;
export type NewRepository = typeof repository.$inferInsert;
