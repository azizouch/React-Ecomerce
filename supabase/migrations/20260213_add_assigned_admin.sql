-- Add assigned_admin_id column to conversations for tracking conversation assignment
ALTER TABLE conversations ADD COLUMN assigned_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX idx_conversations_assigned_admin_id ON conversations(assigned_admin_id);

-- Update the policy to allow admins to see conversations assigned to them
CREATE POLICY "Admins can view assigned conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = assigned_admin_id);
