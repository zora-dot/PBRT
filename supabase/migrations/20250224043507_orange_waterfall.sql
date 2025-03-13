-- Add has_password column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Create function to update user password
CREATE OR REPLACE FUNCTION update_user_password(
  user_id UUID,
  new_password TEXT,
  current_password TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user auth.users;
  v_profile profiles;
BEGIN
  -- Get user and profile info
  SELECT * INTO v_user FROM auth.users WHERE id = user_id;
  SELECT * INTO v_profile FROM profiles WHERE id = user_id;
  
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check current password if user has one
  IF v_profile.has_password THEN
    IF current_password IS NULL THEN
      RAISE EXCEPTION 'Current password is required';
    END IF;
    
    -- Verify current password
    IF NOT crypto.verify_password(current_password, v_user.encrypted_password) THEN
      RAISE EXCEPTION 'Invalid current password';
    END IF;
  END IF;

  -- Update password
  UPDATE auth.users
  SET encrypted_password = crypto.crypt(new_password, crypto.gen_salt('bf'))
  WHERE id = user_id;

  -- Update has_password flag
  UPDATE profiles
  SET has_password = true
  WHERE id = user_id;
END;
$$;