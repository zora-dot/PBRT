-- Drop existing functions
DROP FUNCTION IF EXISTS block_user(UUID);
DROP FUNCTION IF EXISTS unblock_user(UUID);
DROP FUNCTION IF EXISTS is_user_blocked(UUID);

-- Create improved function to block user with explicit column references
CREATE OR REPLACE FUNCTION block_user(p_target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocker_id UUID;
BEGIN
  -- Get current user ID
  v_blocker_id := auth.uid();
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_target_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent self-blocking
  IF p_target_id = v_blocker_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Block user
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (v_blocker_id, p_target_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Remove any existing follows
  DELETE FROM follows
  WHERE (follower_id = v_blocker_id AND following_id = p_target_id)
     OR (follower_id = p_target_id AND following_id = v_blocker_id);

  -- Remove any pending follow requests
  DELETE FROM follow_requests
  WHERE (requester_id = v_blocker_id AND target_id = p_target_id)
     OR (requester_id = p_target_id AND target_id = v_blocker_id);
END;
$$;

-- Create improved function to unblock user with explicit column references
CREATE OR REPLACE FUNCTION unblock_user(p_target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blocker_id UUID;
BEGIN
  -- Get current user ID
  v_blocker_id := auth.uid();
  IF v_blocker_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete the block
  DELETE FROM blocked_users
  WHERE blocker_id = v_blocker_id
  AND blocked_id = p_target_id;
END;
$$;

-- Create improved function to check if user is blocked with explicit column references
CREATE OR REPLACE FUNCTION is_user_blocked(p_target_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_blocked boolean;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = v_user_id AND blocked_id = p_target_id)
       OR (blocker_id = p_target_id AND blocked_id = v_user_id)
  ) INTO v_is_blocked;
  
  RETURN v_is_blocked;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_both ON blocked_users(blocker_id, blocked_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION block_user IS 'Blocks a user and removes any existing follows/requests';
COMMENT ON FUNCTION unblock_user IS 'Unblocks a previously blocked user';
COMMENT ON FUNCTION is_user_blocked IS 'Checks if a user is blocked in either direction';