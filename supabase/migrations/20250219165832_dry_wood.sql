/*
  # Fix Database Relationships

  1. Changes
    - Fix foreign key relationship between pastes and folders
    - Add missing indexes
    - Update paste_details view
    - Add missing RLS policies

  2. Security
    - Ensure proper RLS policies are in place
    - Fix permissions for service role
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS paste_details;

-- Recreate the view with correct relationships
CREATE OR REPLACE VIEW paste_details AS
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
) c ON p.id = c.paste_id;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_pastes_folder_id ON pastes(folder_id);
CREATE INDEX IF NOT EXISTS idx_pastes_user_id_folder_id ON pastes(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id_name ON folders(user_id, name);

-- Add RLS policy for paste_details view
CREATE POLICY "Public pastes are viewable by everyone in paste_details"
ON pastes FOR SELECT
TO public
USING (
  is_public = true 
  OR user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM folders 
    WHERE folders.id = folder_id 
    AND folders.user_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON paste_details TO authenticated;
GRANT SELECT ON paste_details TO anon;

-- Ensure proper foreign key constraints
ALTER TABLE pastes 
  DROP CONSTRAINT IF EXISTS pastes_folder_id_fkey,
  ADD CONSTRAINT pastes_folder_id_fkey 
  FOREIGN KEY (folder_id) 
  REFERENCES folders(id) 
  ON DELETE SET NULL;

-- Add trigger to handle folder deletion
CREATE OR REPLACE FUNCTION handle_folder_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Move pastes to "All Pastes" folder when their folder is deleted
  UPDATE pastes
  SET folder_id = (
    SELECT id FROM folders 
    WHERE user_id = OLD.user_id 
    AND name = 'All Pastes'
    LIMIT 1
  )
  WHERE folder_id = OLD.id;
  
  RETURN OLD;
END;
$$;

CREATE OR REPLACE TRIGGER before_folder_delete
  BEFORE DELETE ON folders
  FOR EACH ROW
  WHEN (OLD.name != 'All Pastes')
  EXECUTE FUNCTION handle_folder_deletion();

-- Ensure "All Pastes" folder exists for all users
INSERT INTO folders (user_id, name)
SELECT id, 'All Pastes'
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM folders f 
  WHERE f.user_id = p.id 
  AND f.name = 'All Pastes'
);