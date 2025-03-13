-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_follow_privacy ON follows;

-- Drop existing function if it exists  
DROP FUNCTION IF EXISTS handle_follow_request();

-- Add past_id column to follows table
ALTER TABLE follows 
ADD COLUMN IF NOT EXISTS past_id uuid DEFAULT gen_random_uuid();

-- Create unique constraint on follower_id and following_id
ALTER TABLE follows
DROP CONSTRAINT IF EXISTS follows_follower_id_following_id_key,
ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);

-- Update follows table to handle private profiles
CREATE OR REPLACE FUNCTION handle_follow_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_public boolean;
  v_existing_request_id uuid;
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

  -- For public profiles, allow the follow and create notification
  INSERT INTO notifications (
    type,
    user_id,
    actor_id
  ) VALUES (
    'follow',
    NEW.following_id,
    NEW.follower_id
  );

  RETURN NEW;
END;
$$;

-- Create trigger for follow requests
CREATE TRIGGER check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request();