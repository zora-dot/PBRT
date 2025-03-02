-- Drop the previous function if it exists
DROP FUNCTION IF EXISTS update_user_password(UUID, TEXT, TEXT);

-- Create improved password update function with explicit schema references
CREATE OR REPLACE FUNCTION public.update_user_password(
  user_id UUID,
  new_password TEXT,
  current_password TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, crypto
AS $$
DECLARE
  v_user auth.users;
  v_profile public.profiles;
  v_email TEXT;
BEGIN
  -- Get user and profile info with explicit schema references
  SELECT * INTO v_user FROM auth.users WHERE id = user_id;
  SELECT * INTO v_profile FROM public.profiles WHERE id = user_id;
  
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
    IF NOT (
      SELECT encrypted_password = extensions.crypt(current_password, encrypted_password)
      FROM auth.users 
      WHERE id = user_id
    ) THEN
      RAISE EXCEPTION 'Invalid current password';
    END IF;
  END IF;

  -- Update password using pgcrypto functions with explicit schema reference
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = user_id;

  -- Update has_password flag with explicit schema reference
  UPDATE public.profiles
  SET has_password = true
  WHERE id = user_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT, TEXT) TO service_role;

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;