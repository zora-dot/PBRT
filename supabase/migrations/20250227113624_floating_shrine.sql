-- Create function to permanently delete a paste
CREATE OR REPLACE FUNCTION permanently_delete_paste(target_paste_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user owns the paste and it's in trash
  IF NOT EXISTS (
    SELECT 1 FROM pastes
    WHERE id = target_paste_id
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Paste not found or not in trash';
  END IF;

  -- Delete the paste and all related data
  DELETE FROM pastes
  WHERE id = target_paste_id
  AND user_id = auth.uid()
  AND deleted_at IS NOT NULL;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION permanently_delete_paste(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION permanently_delete_paste IS 
'Permanently deletes a paste from trash. Only the paste owner can delete their own pastes.';