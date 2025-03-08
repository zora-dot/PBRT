-- Drop existing functions first
DROP FUNCTION IF EXISTS cleanup_deleted_pastes();
DROP FUNCTION IF EXISTS permanently_delete_paste(uuid);
DROP FUNCTION IF EXISTS get_trash_items(uuid);

-- Update cleanup_deleted_pastes function to use paste expiration date
CREATE OR REPLACE FUNCTION cleanup_deleted_pastes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pastes
  WHERE deleted_at IS NOT NULL
  AND (
    -- Delete if paste has expired
    (expires_at IS NOT NULL AND expires_at < NOW())
    OR
    -- Delete if paste has no expiration (permanent pastes)
    (expires_at IS NULL AND deleted_at < NOW() - INTERVAL '30 days')
  );
END;
$$;

-- Create function to permanently delete a paste
CREATE OR REPLACE FUNCTION permanently_delete_paste(target_paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pastes
  WHERE id = target_paste_id
  AND user_id = auth.uid() -- Ensure user can only delete their own pastes
  AND deleted_at IS NOT NULL; -- Only allow deleting from trash
END;
$$;

-- Create secure function to get trash items
CREATE OR REPLACE FUNCTION get_trash_items(target_user_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  created_at timestamptz,
  expires_at timestamptz,
  is_public boolean,
  user_id uuid,
  folder_id uuid,
  deleted_at timestamptz,
  restore_folder_id uuid,
  username text,
  avatar_url text,
  original_folder_name text,
  likes_count bigint,
  favorites_count bigint,
  comments_count bigint,
  time_in_trash interval
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.created_at,
    p.expires_at,
    p.is_public,
    p.user_id,
    p.folder_id,
    p.deleted_at,
    p.restore_folder_id,
    pr.username,
    pr.avatar_url,
    f.name AS original_folder_name,
    COALESCE(l.likes_count, 0)::bigint AS likes_count,
    COALESCE(fav.favorites_count, 0)::bigint AS favorites_count,
    COALESCE(c.comments_count, 0)::bigint AS comments_count,
    (NOW() - p.deleted_at) AS time_in_trash
  FROM pastes p
  LEFT JOIN profiles pr ON p.user_id = pr.id
  LEFT JOIN folders f ON p.restore_folder_id = f.id
  LEFT JOIN (
    SELECT paste_id, COUNT(*) AS likes_count
    FROM likes
    WHERE paste_id IS NOT NULL
    GROUP BY paste_id
  ) l ON p.id = l.paste_id
  LEFT JOIN (
    SELECT paste_id, COUNT(*) AS favorites_count
    FROM favorites
    GROUP BY paste_id
  ) fav ON p.id = fav.paste_id
  LEFT JOIN (
    SELECT paste_id, COUNT(*) AS comments_count
    FROM comments
    GROUP BY paste_id
  ) c ON p.id = c.paste_id
  WHERE p.deleted_at IS NOT NULL
  AND p.user_id = target_user_id;
END;
$$;

-- Schedule the cleanup job (runs daily)
SELECT cron.schedule(
  'cleanup-deleted-pastes',
  '0 0 * * *',
  $$SELECT cleanup_deleted_pastes()$$
);