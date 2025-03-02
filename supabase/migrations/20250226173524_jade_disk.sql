-- Add unique constraint for auto-saved drafts
-- First ensure we have the proper indexes
CREATE INDEX IF NOT EXISTS idx_drafts_user_autosaved 
ON drafts(user_id, is_auto_saved);

CREATE INDEX IF NOT EXISTS idx_drafts_last_modified 
ON drafts(last_modified DESC);

-- Drop existing constraint if it exists
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS unique_user_autosaved_draft;

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_unique_user_autosaved_draft;

-- Create a new partial index for auto-saved drafts
CREATE UNIQUE INDEX idx_unique_user_autosaved_draft
ON drafts (user_id)
WHERE is_auto_saved = true;

-- Ensure the save_draft function is properly updated
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
  v_existing_draft_id UUID;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to save drafts';
  END IF;

  -- Check if auto-saved draft exists
  IF p_is_auto_saved THEN
    SELECT id INTO v_existing_draft_id
    FROM drafts
    WHERE user_id = v_user_id AND is_auto_saved = true;
    
    IF v_existing_draft_id IS NOT NULL THEN
      -- Update existing draft
      UPDATE drafts
      SET 
        content = p_content,
        title = p_title,
        last_modified = NOW()
      WHERE id = v_existing_draft_id
      RETURNING id INTO v_draft_id;
    ELSE
      -- Insert new draft
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
        true,
        NOW()
      )
      RETURNING id INTO v_draft_id;
    END IF;
  ELSE
    -- For non-auto-saved drafts, always insert a new one
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
      false,
      NOW()
    )
    RETURNING id INTO v_draft_id;
  END IF;

  RETURN v_draft_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION save_draft(TEXT, TEXT, BOOLEAN) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION save_draft IS 
'Safely saves a draft for the current user, handling auto-save conflicts';