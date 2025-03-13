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
BEGIN
  -- Verify target exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_target_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Prevent self-blocking
  IF p_target_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Block user
  INSERT INTO blocked_users (blocker_id, blocked_id)
  VALUES (auth.uid(), p_target_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING;

  -- Remove any existing follows
  DELETE FROM follows f
  WHERE (f.follower_id = auth.uid() AND f.following_id = p_target_id)
     OR (f.follower_id = p_target_id AND f.following_id = auth.uid());

  -- Remove any pending follow requests
  DELETE FROM follow_requests fr
  WHERE (fr.requester_id = auth.uid() AND fr.target_id = p_target_id)
     OR (fr.requester_id = p_target_id AND fr.target_id = auth.uid());
END;
$$;

-- Create improved function to unblock user with explicit column references
CREATE OR REPLACE FUNCTION unblock_user(p_target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the block
  DELETE FROM blocked_users bu
  WHERE bu.blocker_id = auth.uid()
  AND bu.blocked_id = p_target_id;
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
  is_blocked boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM blocked_users bu
    WHERE (bu.blocker_id = auth.uid() AND bu.blocked_id = p_target_id)
       OR (bu.blocker_id = p_target_id AND bu.blocked_id = auth.uid())
  ) INTO is_blocked;
  
  RETURN is_blocked;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION block_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION block_user IS 'Blocks a user and removes any existing follows/requests';
COMMENT ON FUNCTION unblock_user IS 'Unblocks a previously blocked user';
COMMENT ON FUNCTION is_user_blocked IS 'Checks if a user is blocked in either direction';