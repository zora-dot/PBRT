-- Create function to safely save draft
CREATE OR REPLACE FUNCTION save_draft(
  p_content TEXT,
  p_title TEXT DEFAULT NULL,
  p_is_auto_saved BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to save drafts';
  END IF;

  -- Insert or update draft
  INSERT INTO drafts (
    user_id,
    content,
    title,
    is_auto_saved,
    last_modified
  ) VALUES (
    v_user_id,
    p_content,
    p_title,
    p_is_auto_saved,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    content = EXCLUDED.content,
    title = EXCLUDED.title,
    last_modified = NOW()
  RETURNING id INTO v_draft_id;

  RETURN v_draft_id;
END;
$$;

-- Create function to get user's drafts
CREATE OR REPLACE FUNCTION get_user_drafts(
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  last_modified TIMESTAMPTZ,
  is_auto_saved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use provided user ID or current user's ID
  p_user_id := COALESCE(p_user_id, auth.uid());
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Only allow users to get their own drafts
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot access drafts of other users';
  END IF;

  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.content,
    d.last_modified,
    d.is_auto_saved
  FROM drafts d
  WHERE d.user_id = p_user_id
  ORDER BY d.last_modified DESC;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drafts_user_autosaved 
ON drafts(user_id, is_auto_saved);

CREATE INDEX IF NOT EXISTS idx_drafts_last_modified 
ON drafts(last_modified DESC);

-- Drop existing constraint if it exists
ALTER TABLE drafts 
DROP CONSTRAINT IF EXISTS unique_user_autosaved_draft;

-- Create a unique constraint for user_id
ALTER TABLE drafts
ADD CONSTRAINT unique_user_autosaved_draft 
UNIQUE (user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION save_draft(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_drafts(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION save_draft IS 
'Safely saves a draft for the current user, handling auto-save conflicts';

COMMENT ON FUNCTION get_user_drafts IS 
'Retrieves drafts for the current user with proper security checks';