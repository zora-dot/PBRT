-- Drop existing function if it exists
DROP FUNCTION IF EXISTS cancel_follow_request(UUID);

-- Create improved function to handle follow request cancellation
CREATE OR REPLACE FUNCTION cancel_follow_request(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Get the request ID
  SELECT id INTO v_request_id
  FROM follow_requests
  WHERE requester_id = auth.uid()
  AND target_id = target_id
  AND status = 'pending';

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'No pending follow request found';
  END IF;

  -- Delete the follow request
  DELETE FROM follow_requests
  WHERE id = v_request_id;

  -- Delete the notification
  DELETE FROM notifications
  WHERE type = 'follow_request'
  AND user_id = target_id
  AND actor_id = auth.uid();
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cancel_follow_request(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION cancel_follow_request IS 
'Cancels a pending follow request and removes associated notification';