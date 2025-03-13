-- First drop policies that depend on blocked_users
DROP POLICY IF EXISTS "Users can manage follows" ON follows;

-- Create new policy for follows without block checks
CREATE POLICY "Users can manage follows"
ON follows
FOR ALL 
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

-- Drop block-related tables (now safe to do so)
DROP TABLE IF EXISTS blocked_users CASCADE;

-- Drop block-related functions
DROP FUNCTION IF EXISTS block_user(UUID);
DROP FUNCTION IF EXISTS unblock_user(UUID);
DROP FUNCTION IF EXISTS is_user_blocked(UUID);

-- Update follows table to handle private profiles without block checks
CREATE OR REPLACE FUNCTION handle_follow_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_public boolean;
  v_existing_request_id uuid;
  v_notification_id uuid;
BEGIN
  -- Check if target profile is public
  SELECT is_public INTO v_is_public
  FROM profiles
  WHERE id = NEW.following_id;

  -- If profile is private, create a follow request instead
  IF NOT v_is_public THEN
    -- Check for existing request
    SELECT id INTO v_existing_request_id
    FROM follow_requests
    WHERE requester_id = NEW.follower_id
    AND target_id = NEW.following_id
    AND status = 'pending';

    -- Only create new request if none exists
    IF v_existing_request_id IS NULL THEN
      INSERT INTO follow_requests (requester_id, target_id)
      VALUES (NEW.follower_id, NEW.following_id);

      -- Create notification for follow request
      INSERT INTO notifications (
        type,
        user_id,
        actor_id
      ) VALUES (
        'follow_request',
        NEW.following_id,
        NEW.follower_id
      );
    END IF;

    RETURN NULL; -- Prevent the follow
  END IF;

  -- For public profiles, create follow notification first
  INSERT INTO notifications (
    type,
    user_id,
    actor_id
  ) VALUES (
    'follow',
    NEW.following_id,
    NEW.follower_id
  )
  RETURNING id INTO v_notification_id;

  -- Verify notification was created
  IF v_notification_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create follow notification';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_follow_privacy ON follows;

-- Create trigger for follow requests
CREATE TRIGGER check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request();

-- Add helpful comment
COMMENT ON FUNCTION handle_follow_request IS 
'Handles follow requests and notifications for both public and private profiles';