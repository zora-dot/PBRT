-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_follow_privacy ON follows;

-- Drop existing function if it exists  
DROP FUNCTION IF EXISTS handle_follow_request();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own follows" ON follows;
DROP POLICY IF EXISTS "Users can manage follows" ON follows;
DROP POLICY IF EXISTS "Public follows access" ON follows;
DROP POLICY IF EXISTS "Anyone can view follows" ON follows;

-- Create policy for follows
CREATE POLICY "Users can manage follows"
ON follows
FOR ALL 
TO authenticated
USING (auth.uid() = follower_id)
WITH CHECK (auth.uid() = follower_id);

-- Create policy for viewing follows
CREATE POLICY "Public follows access"
ON follows
FOR SELECT
TO public
USING (true);

-- Update paste_details view to handle folder relationships explicitly
DROP VIEW IF EXISTS paste_details;
CREATE VIEW paste_details AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url,
  pr.username_color,
  pr.username_bold,
  pr.username_italic,
  pr.username_underline,
  f.name AS folder_name,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(fav.favorites_count, 0) AS favorites_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM pastes p
LEFT JOIN profiles pr ON pr.id = p.user_id
LEFT JOIN folders f ON f.id = p.folder_id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS likes_count
  FROM likes
  WHERE paste_id IS NOT NULL
  GROUP BY paste_id
) l ON l.paste_id = p.id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS favorites_count
  FROM favorites
  GROUP BY paste_id
) fav ON fav.paste_id = p.id
LEFT JOIN (
  SELECT paste_id, COUNT(*) AS comments_count
  FROM comments
  GROUP BY paste_id
) c ON c.paste_id = p.id
WHERE p.deleted_at IS NULL;

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