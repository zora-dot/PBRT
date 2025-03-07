-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create follow requests" ON follow_requests;
DROP POLICY IF EXISTS "Users can view their own follow requests" ON follow_requests;
DROP POLICY IF EXISTS "Users can update their received follow requests" ON follow_requests;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS check_follow_privacy ON follows;
DROP TRIGGER IF EXISTS on_follow_request_created ON follow_requests;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS handle_follow_request();
DROP FUNCTION IF EXISTS handle_follow_request_notification();
DROP FUNCTION IF EXISTS handle_follow_request_response(UUID, TEXT);

-- Create follow requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS follow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(requester_id, target_id)
);

-- Enable RLS
ALTER TABLE follow_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for follow requests
CREATE POLICY "Users can create follow requests"
ON follow_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own follow requests"
ON follow_requests FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can update their received follow requests"
ON follow_requests FOR UPDATE
TO authenticated
USING (auth.uid() = target_id)
WITH CHECK (auth.uid() = target_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_target ON follow_requests(target_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status ON follow_requests(status);

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

-- Function to handle follow request response
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