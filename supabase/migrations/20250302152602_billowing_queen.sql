-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_favorite_created ON favorites;
DROP TRIGGER IF EXISTS on_like_created ON likes;

-- Create improved notification handler for favorites
CREATE OR REPLACE FUNCTION handle_favorite_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notification for favorite
  INSERT INTO notifications (
    type,
    user_id,
    actor_id,
    paste_id
  )
  SELECT 
    'favorite',
    p.user_id,
    NEW.user_id,
    NEW.paste_id
  FROM pastes p
  WHERE p.id = NEW.paste_id
  AND p.user_id != NEW.user_id;

  RETURN NEW;
END;
$$;

-- Create improved notification handler for likes
CREATE OR REPLACE FUNCTION handle_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create notification for like
  IF NEW.paste_id IS NOT NULL THEN
    INSERT INTO notifications (
      type,
      user_id,
      actor_id,
      paste_id
    )
    SELECT 
      'like',
      p.user_id,
      NEW.user_id,
      NEW.paste_id
    FROM pastes p
    WHERE p.id = NEW.paste_id
    AND p.user_id != NEW.user_id;
  ELSE
    INSERT INTO notifications (
      type,
      user_id,
      actor_id,
      comment_id
    )
    SELECT 
      'like',
      c.user_id,
      NEW.user_id,
      NEW.comment_id
    FROM comments c
    WHERE c.id = NEW.comment_id
    AND c.user_id != NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create new triggers for favorites and likes
CREATE TRIGGER on_favorite_created
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION handle_favorite_notification();

CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_like_notification();

-- Add helpful comments
COMMENT ON FUNCTION handle_favorite_notification IS 
'Creates a notification when a paste is favorited';

COMMENT ON FUNCTION handle_like_notification IS 
'Creates a notification when a paste or comment is liked';