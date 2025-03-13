-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_follow_request_created ON follow_requests;
DROP FUNCTION IF EXISTS handle_follow_request_notification();

-- Update notifications table to allow follow_request type
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('like', 'favorite', 'follow', 'comment', 'follow_request'));

-- Create improved follow request notification handler
CREATE OR REPLACE FUNCTION handle_follow_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Create notification for new follow request
    INSERT INTO notifications (
      type,
      user_id,
      actor_id
    ) VALUES (
      'follow_request',
      NEW.target_id,
      NEW.requester_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate trigger for follow request notifications
CREATE TRIGGER on_follow_request_created
  AFTER INSERT ON follow_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_follow_request_notification();

-- Update handle_follow_request_response to create notification on accept
CREATE OR REPLACE FUNCTION handle_follow_request_response(
  p_request_id UUID,
  p_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID;
  v_target_id UUID;
BEGIN
  -- Get request details
  SELECT requester_id, target_id INTO v_requester_id, v_target_id
  FROM follow_requests
  WHERE id = p_request_id;

  -- Verify user owns the request
  IF v_target_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to handle this request';
  END IF;

  -- Update request status
  UPDATE follow_requests
  SET 
    status = p_status,
    updated_at = NOW()
  WHERE id = p_request_id;

  -- If accepted, create the follow relationship
  IF p_status = 'accepted' THEN
    -- Create follow relationship
    INSERT INTO follows (follower_id, following_id)
    VALUES (v_requester_id, v_target_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    -- Create notification for accepted request
    INSERT INTO notifications (
      type,
      user_id,
      actor_id
    ) VALUES (
      'follow',
      v_requester_id,
      v_target_id
    );
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_follow_request_response(UUID, TEXT) TO authenticated;