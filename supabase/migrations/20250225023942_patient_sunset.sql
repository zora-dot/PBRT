-- Drop existing profile policies
DROP POLICY IF EXISTS "Profiles are viewable based on privacy settings" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create new profile policies without circular dependencies
CREATE POLICY "Profiles are viewable based on privacy settings"
ON profiles FOR SELECT
TO public
USING (
  -- Allow if profile is public
  is_public = true OR 
  -- Allow if viewing own profile
  auth.uid() = id OR
  -- Allow if user has public pastes
  EXISTS (
    SELECT 1 FROM pastes 
    WHERE pastes.user_id = profiles.id 
    AND pastes.is_public = true
    AND pastes.deleted_at IS NULL
  ) OR
  -- Allow if user is being followed
  EXISTS (
    SELECT 1 FROM follows
    WHERE follows.following_id = profiles.id
    AND follows.follower_id = auth.uid()
  )
);

-- Update paste_details view to avoid recursion
DROP VIEW IF EXISTS paste_details;
CREATE OR REPLACE VIEW paste_details AS
SELECT 
  p.id,
  p.title,
  p.content,
  p.created_at,
  p.updated_at,
  p.expires_at,
  p.is_public,
  p.user_id,
  p.folder_id,
  p.password_hash,
  p.deleted_at,
  p.restore_folder_id,
  p.custom_url,
  p.search_vector,
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

-- Create policy for paste_details view
DROP POLICY IF EXISTS "Public pastes are viewable by everyone in paste_details" ON pastes;
CREATE POLICY "Pastes are viewable based on permissions"
ON pastes FOR SELECT
TO public
USING (
  -- Allow if paste is public
  is_public = true OR
  -- Allow if user owns the paste
  user_id = auth.uid() OR
  -- Allow if user owns the folder
  folder_id IN (
    SELECT id FROM folders WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pastes_public_visibility 
ON pastes(is_public, deleted_at) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_public_visibility 
ON profiles(is_public);