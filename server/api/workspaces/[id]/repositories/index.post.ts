import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { repository, type NewRepository } from "@@/db/schema/index";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const workspaceId = event.context.params.id;
  if (!workspaceId) throw createError({ statusCode: 400, message: "workspaceId is required" });

  const body = await readBody(event);
  const { name, url } = body;
  if (!name || !url) throw createError({ statusCode: 400, message: "name and url are required" });

  const db = useDb();

  const newRepo: NewRepository = { workspaceId, name, url };
  const [createdRepo] = await db.insert(repository).values(newRepo).returning();

  return { repository: createdRepo };
});
