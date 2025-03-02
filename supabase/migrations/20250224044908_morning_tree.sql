-- Add has_password column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;

-- Update handle_new_user function to set has_password based on sign up method
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile if email is verified
  IF new.email_confirmed_at IS NOT NULL THEN
    INSERT INTO profiles (
      id, 
      username,
      has_password
    )
    VALUES (
      new.id,
      COALESCE(
        new.raw_user_meta_data->>'username',
        'user_' || substr(new.id::text, 1, 8)
      ),
      -- Set has_password to true only for email/password sign ups
      new.encrypted_password IS NOT NULL
    );

    -- Create "Default Folder" for new user
    INSERT INTO folders (user_id, name)
    VALUES (new.id, 'Default Folder');
  END IF;

  RETURN new;
END;
$$;