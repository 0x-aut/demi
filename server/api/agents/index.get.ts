import { auth } from "@@/lib/auth";
import { useDb } from "@@/db/index";
import { agentCatalog } from "@@/db/schema/index";

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const db = useDb();
  const agents = await db.select().from(agentCatalog);

  return { agents };
});
