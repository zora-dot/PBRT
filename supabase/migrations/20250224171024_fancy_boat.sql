-- Create function to safely create folders
CREATE OR REPLACE FUNCTION create_folder(
  p_name TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_id UUID;
BEGIN
  -- Validate input
  IF p_name IS NULL OR p_name = '' THEN
    RAISE EXCEPTION 'Folder name cannot be empty';
  END IF;

  -- Don't allow creating "All Pastes" folder
  IF LOWER(p_name) = 'all pastes' THEN
    RAISE EXCEPTION 'Cannot create folder with name "All Pastes"';
  END IF;

  -- Check if folder with same name exists
  IF EXISTS (
    SELECT 1 FROM folders 
    WHERE user_id = p_user_id 
    AND LOWER(name) = LOWER(p_name)
  ) THEN
    RAISE EXCEPTION 'A folder with this name already exists';
  END IF;

  -- Create the folder
  INSERT INTO folders (
    name,
    user_id
  ) VALUES (
    p_name,
    p_user_id
  )
  RETURNING id INTO v_folder_id;

  RETURN v_folder_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_folder(TEXT, UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION create_folder IS 
'Safely creates a new folder with validation and error handling';