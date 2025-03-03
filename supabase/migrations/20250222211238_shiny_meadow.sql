-- Function to sync username with display name
CREATE OR REPLACE FUNCTION public.sync_username_with_display_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles username when auth.users display name changes
  IF NEW.raw_user_meta_data->>'display_name' IS NOT NULL AND 
     (OLD.raw_user_meta_data->>'display_name' IS NULL OR 
      NEW.raw_user_meta_data->>'display_name' != OLD.raw_user_meta_data->>'display_name') THEN
    
    UPDATE public.profiles
    SET username = NEW.raw_user_meta_data->>'display_name'
    WHERE id = NEW.id
    AND NOT EXISTS (
      -- Check if username is already taken
      SELECT 1 FROM public.profiles
      WHERE username = NEW.raw_user_meta_data->>'display_name'
      AND id != NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for username sync
DROP TRIGGER IF EXISTS on_display_name_change ON auth.users;
CREATE TRIGGER on_display_name_change
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_username_with_display_name();

-- Update existing profiles with display names
UPDATE public.profiles p
SET username = u.raw_user_meta_data->>'display_name'
FROM auth.users u
WHERE p.id = u.id
AND u.raw_user_meta_data->>'display_name' IS NOT NULL
AND NOT EXISTS (
  -- Don't update if username would be duplicate
  SELECT 1 FROM public.profiles
  WHERE username = u.raw_user_meta_data->>'display_name'
  AND id != u.id
);

-- Update handle_email_verification to use display name
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Update is_verified when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    -- Set is_verified to true
    UPDATE auth.users
    SET is_verified = TRUE
    WHERE id = NEW.id;
    
    -- Create profile if it doesn't exist, using display name if available
    INSERT INTO public.profiles (id, username)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
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