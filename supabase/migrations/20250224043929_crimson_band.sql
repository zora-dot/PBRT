-- Drop the previous function if it exists
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT, TEXT);

-- Create improved password update function using pgcrypto
CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password TEXT,
  current_password TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user auth.users;
  v_profile profiles;
  v_email TEXT;
BEGIN
  -- Get user and profile info
  SELECT * INTO v_user FROM auth.users WHERE id = user_id;
  SELECT * INTO v_profile FROM profiles WHERE id = user_id;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get user's email
  v_email := v_user.email;

  -- Check current password if user has one
  IF v_profile.has_password THEN
    IF current_password IS NULL THEN
      RAISE EXCEPTION 'Current password is required';
    END IF;
    
    -- Try to sign in with current password to verify it
    PERFORM auth.sign_in_with_password(v_email, current_password);
  END IF;

  -- Update password using pgcrypto functions
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = user_id;

  -- Update has_password flag
  UPDATE profiles
  SET has_password = true
  WHERE id = user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT, TEXT) TO service_role;