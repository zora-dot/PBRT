/*
  # Update paste creation to support anonymous users

  1. Changes
    - Modify create_paste function to support anonymous users
    - Add anonymous_paste_id column to pastes table
    - Add anonymous_paste_id index for better performance
    - Update RLS policies to allow anonymous paste creation

  2. Security
    - Maintain RLS for authenticated users
    - Add specific policy for anonymous pastes
    - Rate limiting still applies to anonymous users
*/

-- Add anonymous_paste_id column
ALTER TABLE pastes
ADD COLUMN IF NOT EXISTS anonymous_paste_id uuid DEFAULT gen_random_uuid();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_pastes_anonymous_id ON pastes(anonymous_paste_id);

-- Drop existing create_paste function
DROP FUNCTION IF EXISTS create_paste(TEXT, TEXT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT);

-- Create improved paste creation function that supports anonymous users
CREATE OR REPLACE FUNCTION create_paste(
  p_title TEXT,
  p_content TEXT,
  p_expires_at TIMESTAMPTZ,
  p_is_public BOOLEAN,
  p_folder_id UUID DEFAULT NULL,
  p_password_hash TEXT DEFAULT NULL,
  p_anonymous BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paste_id UUID;
  v_user_id UUID;
  v_folder_id UUID;
  v_anonymous_id UUID;
BEGIN
  -- Get the current user's ID if not anonymous
  IF NOT p_anonymous THEN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'User must be authenticated to create non-anonymous paste';
    END IF;
  END IF;

  -- Handle folder selection for authenticated users
  IF NOT p_anonymous AND p_folder_id IS NOT NULL THEN
    -- Verify folder exists and belongs to user
    SELECT id INTO v_folder_id
    FROM folders
    WHERE id = p_folder_id
    AND user_id = v_user_id;

    IF v_folder_id IS NULL THEN
      -- If specified folder is invalid, use Default Folder
      SELECT id INTO v_folder_id
      FROM folders
      WHERE user_id = v_user_id
      AND name = 'Default Folder'
      LIMIT 1;
    END IF;
  END IF;

  -- Generate anonymous ID if needed
  IF p_anonymous THEN
    v_anonymous_id := gen_random_uuid();
  END IF;

  -- Create the paste
  INSERT INTO pastes (
    title,
    content,
    expires_at,
    is_public,
    folder_id,
    user_id,
    password_hash,
    anonymous_paste_id,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_title, 'Untitled Paste'),
    p_content,
    p_expires_at,
    p_is_public,
    CASE WHEN p_anonymous THEN NULL ELSE v_folder_id END,
    v_user_id,
    p_password_hash,
    v_anonymous_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_paste_id;

  -- Verify paste was created
  IF v_paste_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create paste';
  END IF;

  RETURN v_paste_id;
END;
$$;

-- Update RLS policies for anonymous paste creation
DROP POLICY IF EXISTS "Users can insert own pastes" ON pastes;
CREATE POLICY "Allow paste creation"
ON pastes FOR INSERT
TO public
WITH CHECK (
  -- Allow authenticated users to create their own pastes
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  -- Allow anonymous users to create pastes
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Add policy for viewing anonymous pastes
CREATE POLICY "Anyone can view anonymous pastes"
ON pastes FOR SELECT
TO public
USING (
  anonymous_paste_id IS NOT NULL OR
  is_public = true OR
  auth.uid() = user_id
);