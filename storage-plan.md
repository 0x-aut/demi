# Storage Plan — Demi App

## Top-Level Overview

Introduce a complete, production-ready storage layer for the Demi app across two databases:

- **PostgreSQL (Drizzle ORM):** Relational tables for `workspace`, `agent_catalog`, `workspace_agent`, and `chat_session`. Drizzle manages schema-as-code and generates migration files alongside the existing `better-auth_migrations/` pattern.
- **MongoDB (Mongoose):** Document store for chat history. One document per chat session, containing a `messages[]` array with per-message metadata, support for `archived` flags on old messages, and a special `summary` message type for long-session context compression.

The PostgreSQL tables sit in the same database as better-auth's managed tables. The MongoDB URI is a new environment variable. All API routes that currently return empty scaffolds are wired up to the real data layer. A shared context-builder utility assembles the correct message window to send to OpenAI on every chat request.

---

## Sub-Tasks

---

### Sub-Task 1 — Install and Configure Drizzle ORM for PostgreSQL

**Status:** `[ ] pending`

**Intent**
Add Drizzle ORM as the schema-as-code layer for all new PostgreSQL tables. This keeps schema definitions in TypeScript, enables auto-generated migration files, and gives full type safety to every query.

**Expected Outcomes**
- `drizzle-orm` and `drizzle-kit` installed as dependencies.
- A `drizzle.config.ts` at the project root pointing at the same PostgreSQL connection string used by better-auth.
- A `db/` directory created at the project root containing:
  - `db/index.ts` — exports a singleton `db` Drizzle client (using `pg` Pool).
  - `db/schema/index.ts` — re-exports all table schemas.
- `nuxt.config.ts` updated to expose a `databaseUrl` runtime config key (server-only) so API routes can read the Postgres URL via `useRuntimeConfig`.
- `drizzle-kit generate` produces an initial empty migration confirming the toolchain works.

**Todo List**
1. Add `drizzle-orm`, `drizzle-kit` to `package.json` dependencies.
2. Create `drizzle.config.ts` referencing `process.env.AUTH_DATABASE_URL`.
3. Create `db/index.ts` with a Drizzle `postgres-js` or `node-postgres` client using `pg.Pool`.
4. Create `db/schema/index.ts` as the central schema barrel export.
5. Add `AUTH_DATABASE_URL` to `nuxt.config.ts` `runtimeConfig` under a server-only key `databaseUrl`.
6. Run `drizzle-kit generate` to verify the setup produces a migrations folder.

**Relevant Context**
- Existing PostgreSQL pool: [`lib/auth.ts`](lib/auth.ts) — uses `pg.Pool` with `process.env.AUTH_DATABASE_URL`. Reuse the same env var.
- Existing migration reference: [`better-auth_migrations/2026-09-26T14-17-04.739Z.sql`](better-auth_migrations/2026-09-26T14-17-04.739Z.sql) — shows the existing tables to avoid conflicts.
- Runtime config pattern: [`nuxt.config.ts`](nuxt.config.ts) — add `databaseUrl` alongside existing keys.

---

### Sub-Task 2 — Define PostgreSQL Schemas (Drizzle)

**Status:** `[ ] pending`

**Intent**
Declare all four new relational tables as Drizzle schema files. These schemas are the single source of truth for the database structure and generate the SQL migrations automatically.

**Expected Outcomes**
- Four schema files created under `db/schema/`:
  - `workspace.ts` — `workspace` table
  - `agentCatalog.ts` — `agent_catalog` table (global base agents)
  - `workspaceAgent.ts` — `workspace_agent` join/override table
  - `chatSession.ts` — `chat_session` table
- All tables export TypeScript infer types for insert and select.
- `db/schema/index.ts` re-exports all tables.

**Table Definitions**

`workspace`:
- `id` (uuid, PK, default generated)
- `userId` (text, FK → `user.id` on delete cascade)
- `name` (text, not null) — workspace display name
- `repoName` (text, not null) — GitHub repo name
- `repoUrl` (text, not null)
- `githubToken` (text, nullable) — stored token; if null, resolved live from better-auth account
- `branch` (text, not null, default `"main"`)
- `description` (text, nullable)
- `lastSyncedAt` (timestamp, nullable)
- `createdAt` / `updatedAt` (timestamptz, default now)

`agent_catalog`:
- `id` (uuid, PK, default generated)
- `name` (text, not null, unique)
- `description` (text)
- `systemPrompt` (text)
- `model` (text, not null, default `"gpt-4o"`)
- `tools` (jsonb, default `[]`) — array of tool descriptors
- `createdAt` / `updatedAt` (timestamptz)

`workspace_agent`:
- `id` (uuid, PK)
- `workspaceId` (uuid, FK → `workspace.id` on delete cascade)
- `agentId` (uuid, FK → `agent_catalog.id` on delete cascade)
- `systemPromptOverride` (text, nullable)
- `modelOverride` (text, nullable)
- `toolsOverride` (jsonb, nullable)
- `addedAt` (timestamptz, default now)
- Unique constraint on `(workspaceId, agentId)`

`chat_session`:
- `id` (uuid, PK)
- `userId` (text, FK → `user.id`)
- `workspaceId` (uuid, FK → `workspace.id` on delete cascade)
- `workspaceAgentId` (uuid, nullable, FK → `workspace_agent.id`)
- `mongoHistoryId` (text, not null) — the MongoDB `_id` string for the matching chat history document
- `title` (text, nullable)
- `model` (text, not null)
- `totalTokens` (integer, default 0)
- `lastMessagePreview` (text, nullable)
- `status` (text, not null, default `"active"`) — `"active"` | `"archived"`
- `createdAt` / `updatedAt` (timestamptz)

**Todo List**
1. Create `db/schema/workspace.ts` with the `workspace` table definition.
2. Create `db/schema/agentCatalog.ts` with the `agent_catalog` table definition.
3. Create `db/schema/workspaceAgent.ts` with the `workspace_agent` table definition.
4. Create `db/schema/chatSession.ts` with the `chat_session` table definition.
5. Update `db/schema/index.ts` to re-export all four schemas.
6. Run `drizzle-kit generate` to produce the migration SQL file.
7. Run `drizzle-kit migrate` (or push) to apply the migration to the database.

**Relevant Context**
- Sub-Task 1 must be complete (Drizzle client exists).
- Better-auth `user.id` is type `text` (not uuid) — `workspace.userId` and `chat_session.userId` must also be `text` to match the FK.
- Existing migration: [`better-auth_migrations/2026-09-26T14-17-04.739Z.sql`](better-auth_migrations/2026-09-26T14-17-04.739Z.sql) — review before running migrations to avoid conflicts.

---

### Sub-Task 3 — Install and Configure Mongoose for MongoDB

**Status:** `[ ] pending`

**Intent**
Add Mongoose as the ODM for MongoDB. Define the `ChatHistory` schema with the full message subdocument structure including `archived` flags and `summary` type support. Expose a singleton Mongoose connection reused across Nuxt server requests.

**Expected Outcomes**
- `mongoose` package installed.
- `MONGODB_URI` added to `.env` and to `nuxt.config.ts` server-only runtime config.
- `db/mongo.ts` exports a `connectMongo()` function that connects once and reuses the connection.
- `db/models/chatHistory.ts` exports the `ChatHistory` Mongoose model with the full schema.
- No mongoose connection is opened at build time — only on first server-side request.

**ChatHistory Document Shape**
```
{
  _id: ObjectId,                   // referenced as mongoHistoryId in chat_session
  sessionId: string,               // mirrors chat_session.id for cross-reference
  messages: [
    {
      role:      "user" | "assistant" | "system" | "summary",
      content:   string,
      tokens:    number,
      timestamp: Date,
      archived:  boolean (default false)
    }
  ],
  totalTokens:  number,
  createdAt:    Date,
  updatedAt:    Date
}
```

**Todo List**
1. Add `mongoose` to `package.json` dependencies.
2. Add `MONGODB_URI` to `nuxt.config.ts` `runtimeConfig` (server-only).
3. Create `db/mongo.ts` with a lazy singleton `connectMongo()` using `mongoose.connect()`.
4. Create `db/models/chatHistory.ts` defining the message subdocument schema and the `ChatHistory` model.
5. Export both from a `db/index.ts` or keep `db/mongo.ts` and `db/models/` separate — consistent with the Drizzle structure chosen in Sub-Task 1.

**Relevant Context**
- `lib/openai.ts` uses a singleton pattern (`let _client`) — use the same pattern for the Mongoose connection in `db/mongo.ts`.
- Nuxt server-only runtime config pattern established in Sub-Task 1.

---

### Sub-Task 4 — Chat Context Builder Utility

**Status:** `[ ] pending`

**Intent**
Implement a server-side utility (`lib/context.ts`) that reads a session's MongoDB chat history and returns the correctly windowed message array to pass to OpenAI. This is the core of the hybrid context strategy: full history below the token threshold, rolling window + summary above it.

**Expected Outcomes**
- `lib/context.ts` exports a single function `buildContextMessages(sessionId: string, tokenThreshold?: number)`.
- Below the threshold: returns all non-archived messages in order.
- At or above the threshold: calls OpenAI to generate a summary, stores it as a `summary`-role message in the MongoDB document, marks older messages `archived: true`, and returns `[summaryMessage, ...recentWindow]`.
- The token threshold defaults to a constant (e.g., 6000 tokens) but is overridable.
- The recent window size after summarisation is also a configurable constant (e.g., last 20 messages).

**Context Assembly Logic**
```
1. Load ChatHistory document for sessionId.
2. Filter messages where archived === false.
3. Sum tokens across active messages.
4. If sum < threshold:
     return active messages (as OpenAI message format).
5. If sum >= threshold:
   a. Find the most recent existing summary message (if any).
   b. Take messages since the last summary.
   c. Call OpenAI to summarise those messages into one summary string.
   d. Write new summary message (role: "summary", archived: false) to MongoDB.
   e. Mark all messages before the summary window as archived: true.
   f. Return [summary message converted to system role, ...last N active messages].
```

**Todo List**
1. Create `lib/context.ts` with the `buildContextMessages` function.
2. Define `TOKEN_THRESHOLD` and `WINDOW_SIZE` as named constants at the top of the file.
3. Implement the "below threshold" path (simple filter + map to OpenAI format).
4. Implement the "above threshold" path (summarise → write → archive → return window).
5. Map `summary` role to OpenAI `system` role when building the messages array for the API call.
6. Write a JSDoc comment block explaining the hybrid strategy at the top of the function.

**Relevant Context**
- `lib/openai.ts` — use `useOpenAI()` singleton for the summarisation call.
- `db/models/chatHistory.ts` (Sub-Task 3) — the Mongoose model used to read/write history.
- `server/api/chat/index.post.ts` — this utility will be consumed here in Sub-Task 6.

---

### Sub-Task 5 — Workspace API Routes

**Status:** `[ ] pending`

**Intent**
Create fully functional CRUD API routes for workspaces. Include a live GitHub token resolver that first tries the stored `githubToken`, and falls back to querying the better-auth `account` table for the user's GitHub OAuth token.

**Expected Outcomes**
- `GET /api/workspaces` — returns all workspaces for the authenticated user.
- `POST /api/workspaces` — creates a new workspace (accepts name, repoName, repoUrl, branch, description).
- `GET /api/workspaces/[id]` — returns a single workspace.
- `PUT /api/workspaces/[id]` — updates mutable fields.
- `DELETE /api/workspaces/[id]` — deletes workspace and cascades to sessions.
- A server-side utility `lib/github-token.ts` that resolves the effective GitHub token for a user: prefers `workspace.githubToken`, falls back to better-auth `account` table query for `providerId = "github"`.

**Todo List**
1. Create `server/api/workspaces/index.get.ts` — GET all workspaces for current user (read userId from better-auth session cookie).
2. Create `server/api/workspaces/index.post.ts` — POST create workspace.
3. Create `server/api/workspaces/[id].get.ts` — GET single workspace.
4. Create `server/api/workspaces/[id].put.ts` — PUT update workspace.
5. Create `server/api/workspaces/[id].delete.ts` — DELETE workspace.
6. Create `lib/github-token.ts` — `resolveGithubToken(userId, workspaceId)` utility.
7. All routes must resolve the current user from the better-auth session (using `auth.api.getSession` from `lib/auth.ts` server-side).

**Relevant Context**
- `lib/auth.ts` — `auth.api.getSession({ headers: event.headers })` is the server-side way to get the current user in better-auth.
- `db/index.ts` — Drizzle client for Postgres queries.
- `db/schema/workspace.ts` — table definition.
- Better-auth `account` table (already in Postgres, created by better-auth migration) — has `accessToken` and `providerId = "github"` for OAuth users.

---

### Sub-Task 6 — Agents API Routes

**Status:** `[ ] pending`

**Intent**
Replace the empty agent scaffolds with real database-backed routes. Implement both the global catalog (admin-managed) and the per-workspace agent management (user-managed with override fields).

**Expected Outcomes**
- `GET /api/agents` — returns global `agent_catalog` entries (optionally filtered).
- `GET /api/workspaces/[id]/agents` — returns all `workspace_agent` rows for a workspace, joined with catalog data and merged with any overrides.
- `POST /api/workspaces/[id]/agents` — adds an agent from the catalog to a workspace (with optional overrides).
- `PUT /api/workspaces/[id]/agents/[agentId]` — updates override fields only.
- `DELETE /api/workspaces/[id]/agents/[agentId]` — removes a workspace agent.
- The existing `server/api/agents/index.get.ts` and `server/api/agents/index.post.ts` are updated to serve the global catalog.

**Todo List**
1. Update `server/api/agents/index.get.ts` to query `agent_catalog` from Drizzle.
2. Update `server/api/agents/index.post.ts` to insert into `agent_catalog` (admin path only).
3. Create `server/api/workspaces/[id]/agents/index.get.ts` — list workspace agents.
4. Create `server/api/workspaces/[id]/agents/index.post.ts` — add agent to workspace.
5. Create `server/api/workspaces/[id]/agents/[agentId].put.ts` — update overrides.
6. Create `server/api/workspaces/[id]/agents/[agentId].delete.ts` — remove from workspace.

**Relevant Context**
- `db/schema/agentCatalog.ts` and `db/schema/workspaceAgent.ts` — table definitions.
- Sub-Task 5 route patterns for auth session resolution.

---

### Sub-Task 7 — Chat Session and History API Routes

**Status:** `[ ] pending`

**Intent**
Wire up the sessions scaffold and the chat route to full persistence. Every chat request creates or continues a session, persists each message to MongoDB, and updates the Postgres `chat_session` row with token totals, last-message preview, and updated timestamp. The sessions list route queries Postgres for metadata.

**Expected Outcomes**
- `GET /api/sessions` — returns `chat_session` rows for the current user (with optional workspace filter).
- `POST /api/chat` — updated to:
  1. Accept `sessionId` (optional — omit to start a new session).
  2. If new session: create a MongoDB `ChatHistory` document and a Postgres `chat_session` row.
  3. Append the user message to MongoDB.
  4. Call `buildContextMessages()` to get the windowed context.
  5. Call OpenAI with the context.
  6. Append the assistant reply to MongoDB.
  7. Update `chat_session.totalTokens`, `lastMessagePreview`, `updatedAt` in Postgres.
  8. Return `{ sessionId, reply, model, usage }`.
- `GET /api/sessions/[id]` — returns session metadata + full message history from MongoDB.

**Todo List**
1. Update `server/api/sessions/index.get.ts` — query `chat_session` by userId, optional workspaceId filter.
2. Create `server/api/sessions/[id].get.ts` — fetch session metadata (Postgres) + full history (MongoDB).
3. Rewrite `server/api/chat/index.post.ts` to implement the full persistence flow above.
4. New sessions auto-generate a title from the first user message (first 60 characters).
5. Add `workspaceId` and `workspaceAgentId` as optional request body fields so the session is linked to a workspace and agent.

**Relevant Context**
- `lib/context.ts` (Sub-Task 4) — `buildContextMessages()` is called here.
- `db/models/chatHistory.ts` (Sub-Task 3) — Mongoose model for append operations.
- `db/schema/chatSession.ts` (Sub-Task 2) — Drizzle table for session metadata.
- Current `server/api/chat/index.post.ts` — existing OpenAI call to preserve and wrap.

---

### Sub-Task 8 — Review API Route (GitHub Integration)

**Status:** `[ ] pending`

**Intent**
Implement the `GET /api/review` route to fetch pull-request reviews and issue comments from the connected GitHub repository using the resolved GitHub token.

**Expected Outcomes**
- `GET /api/review?workspaceId=<id>` — accepts a workspace ID, resolves the GitHub token, fetches recent PR reviews and/or issue comments from the GitHub REST API, and returns them in a normalised shape.
- The existing empty scaffold in `server/api/review/index.get.ts` is replaced.

**Todo List**
1. Update `server/api/review/index.get.ts` to accept `workspaceId` as a query parameter.
2. Use `resolveGithubToken()` from `lib/github-token.ts` (Sub-Task 5) to get the token.
3. Look up `workspace.repoName` and `workspace.repoUrl` from Postgres.
4. Use the native `fetch` API (no extra GitHub SDK) to call GitHub REST API endpoints for PR reviews.
5. Normalise and return the response in the existing `{ reviews: [...] }` shape.

**Relevant Context**
- `lib/github-token.ts` (Sub-Task 5).
- `db/schema/workspace.ts` (Sub-Task 2).
- GitHub REST API: `GET /repos/{owner}/{repo}/pulls` and `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`.

---

### Sub-Task 9 — Wire Up Frontend

**Status:** `[ ] pending`

**Intent**
Update the frontend layouts and pages to consume the real API routes. The sidebar recent-sessions list should populate from the sessions API. The workspace page should show actual workspace info. Auth session data should replace hardcoded user names.

**Expected Outcomes**
- `app/layouts/use.vue`: replace hardcoded `"Marvellous"` user name with session data; populate `recentSessions` from `GET /api/sessions?workspaceId=...`.
- `app/layouts/set.vue`: already reads session on mount — no change needed unless identified.
- `app/pages/[username]/index.vue`: show the user's list of workspaces fetched from `GET /api/workspaces`.
- `app/pages/[username]/[workspace]/sessions/index.vue`: render session list from the sessions API.
- `app/pages/[username]/[workspace]/agents/index.vue`: render workspace agents from the agents API.

**Todo List**
1. Update `app/layouts/use.vue` to call `authClient.getSession()` on mount and replace hardcoded name.
2. Update `app/layouts/use.vue` to fetch `recentSessions` from `/api/sessions` with current workspace filter.
3. Update `app/pages/[username]/index.vue` to fetch and list workspaces from `/api/workspaces`.
4. Update `app/pages/[username]/[workspace]/sessions/index.vue` to fetch from `/api/sessions?workspaceId=`.
5. Update `app/pages/[username]/[workspace]/agents/index.vue` to fetch from `/api/workspaces/[id]/agents`.

**Relevant Context**
- `lib/auth-client.ts` — `authClient.getSession()` / `useSession()` composable.
- `app/layouts/use.vue` — `recentSessions` ref currently empty.
- Workspace ID mapping: the `[workspace]` URL param is the workspace name, but API calls need the UUID. A lookup or slug-based query will be needed.

---

## Environment Variables Required

Add the following to `.env`:

| Variable | Purpose |
|---|---|
| `AUTH_DATABASE_URL` | Already exists — PostgreSQL for better-auth + Drizzle |
| `MONGODB_URI` | New — MongoDB connection string for Mongoose |
| `OPENAI_API_KEY` | Already exists |
| `GITHUB_CLIENT_ID` | Already exists |
| `GITHUB_CLIENT_SECRET` | Already exists |

---

## Dependency Additions Summary

| Package | Purpose |
|---|---|
| `drizzle-orm` | Drizzle ORM core |
| `drizzle-kit` | Drizzle CLI for codegen + migrations |
| `mongoose` | MongoDB ODM |

No other new packages required — `pg`, `openai`, and `better-auth` are already installed.
