-- Add project_id column to chat_conversations for space-specific chats
ALTER TABLE chat_conversations 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for project-specific queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_id ON chat_conversations(project_id);

-- Create composite index for user + project queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_project ON chat_conversations(user_id, project_id);
