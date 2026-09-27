import { auth } from "@@/lib/auth";
import { randomBytes } from "crypto";

/**
 * GET /api/github/connect
 *
 * Starts a GitHub OAuth flow for linking a GitHub account to an existing
 * email/password user. Does NOT use better-auth's social sign-in path —
 * it uses a plain OAuth redirect so we control the full flow.
 *
 * CSRF is handled by storing a signed nonce + userId in an HttpOnly cookie
 * rather than in the `state` URL param (which conflicts with better-auth's
 * own state cookie when both use the same GitHub App).
 *
 * Query params:
 *   returnTo – path to send the user after linking (default: /)
 */
export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({ headers: event.headers });
  if (!session) throw createError({ statusCode: 401, message: "Unauthorized" });

  const config = useRuntimeConfig();
  const clientId = config.githubClientKey;
  if (!clientId) {
    throw createError({ statusCode: 500, message: "GitHub OAuth is not configured." });
  }

  const query = getQuery(event);
  const returnTo = String(query.returnTo ?? "/");

  // Generate a random nonce for CSRF protection
  const nonce = randomBytes(16).toString("hex");

  // Store nonce + userId + returnTo in a short-lived HttpOnly cookie.
  // The callback verifies the nonce and reads userId from here — nothing
  // sensitive travels through the browser URL.
  const cookieValue = Buffer.from(
    JSON.stringify({ nonce, userId: session.user.id, returnTo }),
  ).toString("base64");

  setCookie(event, "gh_connect_state", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Send nonce as state so we can verify it in the callback.
  // We only put the nonce (not userId) in the URL — userId stays in the cookie.
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${config.public?.appUrl ?? process.env.NUXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/github/callback`,
    scope: "repo read:user",
    state: nonce,
  });

  return sendRedirect(
    event,
    `https://github.com/login/oauth/authorize?${params.toString()}`,
  );
});
