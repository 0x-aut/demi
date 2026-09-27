import { Pool } from "pg";

/**
 * GET /api/github/callback
 *
 * Receives the GitHub OAuth redirect after the user grants access.
 * This path is registered in the GitHub OAuth App settings as the
 * callback URL — it must NOT be /api/auth/callback/github (that belongs
 * to better-auth's sign-in flow).
 *
 * CSRF verification: the `state` param is matched against the nonce stored
 * in the `gh_connect_state` HttpOnly cookie set by /api/github/connect.
 * userId and returnTo are read from that same cookie — never from the URL.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  const code = String(query.code ?? "");
  const stateFromGithub = String(query.state ?? "");

  // Read + immediately clear the state cookie
  const cookieRaw = getCookie(event, "gh_connect_state");
  deleteCookie(event, "gh_connect_state", { path: "/" });

  if (!code) {
    throw createError({ statusCode: 400, message: "Missing code from GitHub." });
  }

  if (!cookieRaw) {
    throw createError({
      statusCode: 400,
      message: "Session expired or connect was not initiated from this browser. Please try again.",
    });
  }

  // Decode cookie
  let nonce: string;
  let userId: string;
  let returnTo: string;
  try {
    const decoded = JSON.parse(Buffer.from(cookieRaw, "base64").toString("utf-8"));
    nonce = decoded.nonce;
    userId = decoded.userId;
    returnTo = decoded.returnTo ?? "/";
  } catch {
    throw createError({ statusCode: 400, message: "Invalid connect state cookie." });
  }

  // Verify CSRF nonce
  if (!nonce || stateFromGithub !== nonce) {
    throw createError({
      statusCode: 400,
      message: "State mismatch — possible CSRF attempt. Please try connecting again.",
    });
  }

  if (!userId) {
    throw createError({ statusCode: 400, message: "Missing userId in connect state." });
  }

  // Exchange code for access token
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NUXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.githubClientKey,
      client_secret: config.githubClientSecret,
      code,
      redirect_uri: `${baseUrl}/api/github/callback`,
    }),
  });

  if (!tokenRes.ok) {
    throw createError({ statusCode: 502, message: "GitHub token exchange failed." });
  }

  const tokenData = await tokenRes.json() as { access_token?: string; error?: string; error_description?: string };

  if (!tokenData.access_token) {
    throw createError({
      statusCode: 502,
      message: `GitHub denied the token: ${tokenData.error_description ?? tokenData.error ?? "unknown error"}.`,
    });
  }

  const accessToken = tokenData.access_token;

  // Persist token into better-auth's account table.
  // resolveGithubAccess reads: SELECT "accessToken" FROM "account"
  //   WHERE "userId" = $1 AND "providerId" = 'github'
  // No unique constraint on (userId, providerId) — UPDATE first, INSERT if missing.
  const pool = new Pool({
    connectionString: `${process.env.CONNECTION_STRING}defaultdb`,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const update = await pool.query(
      `UPDATE "account"
       SET "accessToken" = $2, "updatedAt" = NOW()
       WHERE "userId" = $1 AND "providerId" = 'github'`,
      [userId, accessToken],
    );

    if ((update.rowCount ?? 0) === 0) {
      await pool.query(
        `INSERT INTO "account"
           ("id", "accountId", "providerId", "userId", "accessToken", "createdAt", "updatedAt")
         VALUES
           (gen_random_uuid()::text, $1, 'github', $1, $2, NOW(), NOW())`,
        [userId, accessToken],
      );
    }
  } finally {
    await pool.end();
  }

  return sendRedirect(event, returnTo);
});
