-- Fix ambiguous user_id references in paste_details view
DROP VIEW IF EXISTS paste_details;
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

-- Update paste creation policy to be more explicit
DROP POLICY IF EXISTS "Users can insert own pastes" ON pastes;
CREATE POLICY "Users can insert own pastes"
ON pastes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add helper function for paste creation
CREATE OR REPLACE FUNCTION create_paste(
  p_title TEXT,
  p_content TEXT,
  p_expires_at TIMESTAMPTZ,
  p_is_public BOOLEAN,
  p_folder_id UUID,
  p_password_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paste_id UUID;
BEGIN
  INSERT INTO pastes (
    title,
    content,
    expires_at,
    is_public,
    folder_id,
    user_id,
    password_hash
  ) VALUES (
    p_title,
    p_content,
    p_expires_at,
    p_is_public,
    p_folder_id,
    auth.uid(),
    p_password_hash
  )
  RETURNING id INTO v_paste_id;

  RETURN v_paste_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_paste(TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT) TO authenticated;