-- Create function to handle user authentication with better error handling
CREATE OR REPLACE FUNCTION authenticate_user_with_details(
  p_login TEXT,
  p_password TEXT
)
RETURNS TABLE (
  user_exists BOOLEAN,
  user_email TEXT,
  user_name TEXT,
  is_confirmed BOOLEAN,
  is_valid_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_is_confirmed BOOLEAN;
  v_encrypted_password TEXT;
  v_is_valid_password BOOLEAN;
BEGIN
  -- First try to find by email (case insensitive)
  SELECT 
    u.id, 
    u.email,
    u.email_confirmed_at IS NOT NULL,
    u.encrypted_password
  INTO 
    v_user_id, 
    v_email,
    v_is_confirmed,
    v_encrypted_password
  FROM auth.users u
  WHERE LOWER(u.email) = LOWER(p_login)
  AND u.deleted_at IS NULL;

  -- If not found by email, try username (case insensitive)
  IF v_user_id IS NULL THEN
    SELECT 
      u.id, 
      u.email,
      u.email_confirmed_at IS NOT NULL,
      u.encrypted_password
    INTO 
      v_user_id, 
      v_email,
      v_is_confirmed,
      v_encrypted_password
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE LOWER(p.username) = LOWER(p_login)
    AND u.deleted_at IS NULL;
  END IF;

  -- Get username if user found
  IF v_user_id IS NOT NULL THEN
    SELECT username INTO v_username
    FROM public.profiles
    WHERE id = v_user_id;

    -- Verify password
    v_is_valid_password := crypt(p_password, v_encrypted_password) = v_encrypted_password;
  END IF;

  RETURN QUERY
  SELECT 
    v_user_id IS NOT NULL,
    v_email,
    v_username,
    COALESCE(v_is_confirmed, false),
    COALESCE(v_is_valid_password, false);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION authenticate_user_with_details(TEXT, TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON FUNCTION authenticate_user_with_details IS 
'Authenticates a user by username or email and returns detailed status information';