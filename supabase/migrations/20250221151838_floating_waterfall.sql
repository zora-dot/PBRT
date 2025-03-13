/*
  # Rename Default Folder and Add Trash System

  1. Changes
    - Rename "All Pastes" folder to "Default Folder"
    - Add soft delete functionality for pastes
    - Add automatic cleanup after 10 days
    - Add trash management functions

  2. Security
    - All functions are SECURITY DEFINER
    - User validation in functions
*/

-- Rename existing "All Pastes" folders to "Default Folder"
UPDATE folders SET name = 'Default Folder' WHERE name = 'All Pastes';

-- Update handle_new_user function to use new folder name
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if email is verified
  IF new.email_confirmed_at IS NOT NULL THEN
    INSERT INTO profiles (id, username)
    VALUES (
      new.id,
      COALESCE(
        new.raw_user_meta_data->>'username',
        'user_' || substr(new.id::text, 1, 8)
      )
    );

    -- Create "Default Folder" for new user
    INSERT INTO folders (user_id, name)
    VALUES (new.id, 'Default Folder');
  END IF;

  RETURN new;
END;
$$;

-- Update handle_folder_deletion function to use new folder name
CREATE OR REPLACE FUNCTION handle_folder_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Move pastes to "Default Folder" when their folder is deleted
  UPDATE pastes
  SET folder_id = (
    SELECT id FROM folders 
    WHERE user_id = OLD.user_id 
    AND name = 'Default Folder'
    LIMIT 1
  )
  WHERE folder_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create function to soft delete pastes
CREATE OR REPLACE FUNCTION soft_delete_paste(paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pastes
  SET deleted_at = NOW(),
      restore_folder_id = folder_id,
      folder_id = NULL
  WHERE id = paste_id
  AND user_id = auth.uid(); -- Ensure user can only delete their own pastes
END;
$$;

-- Create function to restore soft deleted pastes
CREATE OR REPLACE FUNCTION restore_paste(paste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE pastes
  SET deleted_at = NULL,
      folder_id = COALESCE(
        restore_folder_id,
        (
          SELECT id FROM folders
          WHERE user_id = pastes.user_id
          AND name = 'Default Folder'
          LIMIT 1
        )
      ),
      restore_folder_id = NULL
  WHERE id = paste_id
  AND user_id = auth.uid(); -- Ensure user can only restore their own pastes
END;
$$;

-- Create function to permanently delete old soft-deleted pastes
CREATE OR REPLACE FUNCTION cleanup_deleted_pastes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM pastes
  WHERE deleted_at IS NOT NULL
  AND deleted_at < NOW() - INTERVAL '10 days';
END;
$$;

-- Schedule the cleanup job (runs daily)
SELECT cron.schedule(
  'cleanup-deleted-pastes',
  '0 0 * * *',
  $$SELECT cleanup_deleted_pastes()$$
);

-- Create secure function to get trash items
CREATE OR REPLACE FUNCTION get_trash_items(requesting_user_id uuid)
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
  time_in_trash interval,
  time_until_deletion interval
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
    COALESCE(l.likes_count, 0) AS likes_count,
    COALESCE(fav.favorites_count, 0) AS favorites_count,
    COALESCE(c.comments_count, 0) AS comments_count,
    (NOW() - p.deleted_at) AS time_in_trash,
    (INTERVAL '10 days' - (NOW() - p.deleted_at)) AS time_until_deletion
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
  AND p.user_id = requesting_user_id;
END;
$$;

-- Update paste_details view to exclude deleted items
DROP VIEW IF EXISTS paste_details;
CREATE VIEW paste_details AS
SELECT 
  p.*,
  pr.username,
  pr.avatar_url,
  f.name AS folder_name,
  COALESCE(l.likes_count, 0) AS likes_count,
  COALESCE(fav.favorites_count, 0) AS favorites_count,
  COALESCE(c.comments_count, 0) AS comments_count
FROM pastes p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN folders f ON p.folder_id = f.id
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
WHERE p.deleted_at IS NULL;