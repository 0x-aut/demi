CREATE TABLE repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspace(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL
);

ALTER TABLE chat_session
ADD COLUMN repository_id UUID REFERENCES repository(id) ON DELETE SET NULL;

CREATE INDEX idx_chat_session_workspace_id ON chat_session(workspace_id);
CREATE INDEX idx_chat_session_repository_id ON chat_session(repository_id);
