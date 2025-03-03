-- Drop existing functions
DROP FUNCTION IF EXISTS cancel_follow_request(UUID);
DROP FUNCTION IF EXISTS respond_to_follow_request(UUID, TEXT);

-- Create improved function to handle follow request cancellation
CREATE OR REPLACE FUNCTION cancel_follow_request(p_target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Get the request ID using explicit table alias and column references
  SELECT fr.id INTO v_request_id
  FROM follow_requests fr
  WHERE fr.requester_id = auth.uid()
  AND fr.target_id = p_target_id
  AND fr.status = 'pending';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'No pending follow request found';
  END IF;

  -- Delete the follow request using explicit table alias
  DELETE FROM follow_requests fr
  WHERE fr.id = v_request_id;

  -- Delete the notification using explicit table alias
  DELETE FROM notifications n
  WHERE n.type = 'follow_request'
  AND n.user_id = p_target_id
  AND n.actor_id = auth.uid();
END;
$$;

-- Create improved function to handle follow request response
CREATE OR REPLACE FUNCTION respond_to_follow_request(
  p_request_id UUID,
  p_response TEXT
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
  -- Get request details using explicit table alias
  SELECT fr.requester_id, fr.target_id 
  INTO v_requester_id, v_target_id
  FROM follow_requests fr
  WHERE fr.id = p_request_id
  AND fr.status = 'pending';

  IF v_requester_id IS NULL OR v_target_id IS NULL THEN
    RAISE EXCEPTION 'Follow request not found';
  END IF;

  -- Verify ownership
  IF v_target_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to respond to this request';
  END IF;

  -- Update request status using explicit table alias
  UPDATE follow_requests fr
  SET 
    status = p_response,
    updated_at = NOW()
  WHERE fr.id = p_request_id;

  -- If accepted, create follow relationship
  IF p_response = 'accepted' THEN
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
GRANT EXECUTE ON FUNCTION cancel_follow_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_follow_request(UUID, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION cancel_follow_request IS 
'Cancels a pending follow request and removes associated notification';

COMMENT ON FUNCTION respond_to_follow_request IS 
'Handles the response (accept/reject) to a follow request';