-- Create table for repositories
CREATE TABLE "repository" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "repo_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alter chat_session to include a repository reference
ALTER TABLE "chat_session"
ADD COLUMN "repository_id" UUID REFERENCES "repository"("id") ON DELETE SET NULL;
