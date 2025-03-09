/*
  # Update shortened URLs policies

  1. Changes
    - Update RLS policies to allow URL shortening for anonymous pastes
    - Add helper function to validate paste access
    - Add indexes for better performance

  2. Security
    - Ensure proper access control for shortened URLs
    - Maintain privacy settings of pastes
*/

-- Create function to check if user can access paste
CREATE OR REPLACE FUNCTION can_access_paste(paste_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paste RECORD;
BEGIN
  SELECT is_public, user_id, anonymous_paste_id
  INTO v_paste
  FROM pastes
  WHERE id = paste_id;

  IF v_paste IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN (
    v_paste.is_public OR
    v_paste.anonymous_paste_id IS NOT NULL OR
    (auth.uid() IS NOT NULL AND auth.uid() = v_paste.user_id)
  );
END;
$$;

-- Drop existing shortened URLs policies
DROP POLICY IF EXISTS "Anyone can view shortened URLs" ON shortened_urls;
DROP POLICY IF EXISTS "Users can insert shortened URLs for their pastes" ON shortened_urls;
DROP POLICY IF EXISTS "Users can delete shortened URLs for their pastes" ON shortened_urls;

-- Create new policies for shortened URLs
CREATE POLICY "Allow viewing shortened URLs"
ON shortened_urls FOR SELECT
TO public
USING (
  can_access_paste(paste_id)
);

CREATE POLICY "Allow creating shortened URLs"
ON shortened_urls FOR INSERT
TO public
WITH CHECK (
  can_access_paste(paste_id)
);

CREATE POLICY "Allow deleting shortened URLs"
ON shortened_urls FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = paste_id
    AND (
      -- Allow deletion by paste owner
      (auth.uid() IS NOT NULL AND auth.uid() = pastes.user_id) OR
      -- Allow deletion of anonymous paste URLs
      pastes.anonymous_paste_id IS NOT NULL
    )
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shortened_urls_paste_id ON shortened_urls(paste_id);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_short_id ON shortened_urls(short_id);
CREATE INDEX IF NOT EXISTS idx_shortened_urls_clicks ON shortened_urls(clicks);