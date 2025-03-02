-- Create or replace the function to handle email verification and profile creation
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_verified when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Set is_verified to true
    UPDATE auth.users
    SET is_verified = TRUE
    WHERE id = NEW.id;
    
    -- Create profile if it doesn't exist
    INSERT INTO public.profiles (id, username)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'username',
        'user_' || substr(NEW.id::text, 1, 8)
      )
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create default folder for the user if it doesn't exist
    INSERT INTO public.folders (user_id, name)
    SELECT NEW.id, 'Default Folder'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.folders 
      WHERE user_id = NEW.id 
      AND name = 'Default Folder'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create missing profiles for existing verified users
INSERT INTO public.profiles (id, username)
SELECT 
  users.id,
  COALESCE(
    users.raw_user_meta_data->>'username',
    'user_' || substr(users.id::text, 1, 8)
  )
FROM auth.users
WHERE users.email_confirmed_at IS NOT NULL
AND users.is_verified = TRUE
AND NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = users.id
);

-- Create default folders for existing verified users without one
INSERT INTO public.folders (user_id, name)
SELECT 
  profiles.id,
  'Default Folder'
FROM public.profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.folders 
  WHERE folders.user_id = profiles.id 
  AND folders.name = 'Default Folder'
);