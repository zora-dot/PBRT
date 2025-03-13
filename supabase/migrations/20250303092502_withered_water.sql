-- Create blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Create policies for blocked users
CREATE POLICY "Users can manage their blocked users"
ON blocked_users
FOR ALL
TO authenticated
USING (auth.uid() = blocker_id)
WITH CHECK (auth.uid() = blocker_id);

-- Create function to block user
CREATE OR REPLACE FUNCTION block_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = target_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent self-blocking
  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Block user
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), target_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Remove any existing follows
  DELETE FROM follows
  WHERE (follower_id = auth.uid() AND following_id = target_id)
     OR (follower_id = target_id AND following_id = auth.uid());

  -- Remove any pending follow requests
  DELETE FROM follow_requests
  WHERE (requester_id = auth.uid() AND target_id = target_id)
     OR (requester_id = target_id AND target_id = auth.uid());
END;
$$;

-- Create function to unblock user
CREATE OR REPLACE FUNCTION unblock_user(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the block
  DELETE FROM blocked_users
  WHERE blocker_id = auth.uid()
  AND blocked_id = target_id;
END;
$$;

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION is_user_blocked(target_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = target_id)
       OR (blocker_id = target_id AND blocked_id = auth.uid())
  ) INTO is_blocked;
  
  RETURN is_blocked;
END;
$$;

-- Update follows policies to respect blocks
DROP POLICY IF EXISTS "Users can manage follows" ON follows;
CREATE POLICY "Users can manage follows"
ON follows
FOR ALL 
TO authenticated
USING (
  auth.uid() = follower_id 
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = following_id)
       OR (blocker_id = following_id AND blocked_id = auth.uid())
  )
)
WITH CHECK (
  auth.uid() = follower_id
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = following_id)
       OR (blocker_id = following_id AND blocked_id = auth.uid())
  )
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION block_user IS 'Blocks a user and removes any existing follows/requests';
COMMENT ON FUNCTION unblock_user IS 'Unblocks a previously blocked user';
COMMENT ON FUNCTION is_user_blocked IS 'Checks if a user is blocked in either direction';