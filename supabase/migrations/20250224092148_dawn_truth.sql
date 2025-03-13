/*
  # Remove Captcha Verification

  1. Changes
    - Drop any remaining captcha-related functions
    - Remove captcha-related columns from auth.users
    - Update email verification trigger to work without captcha
    - Preserve email verification functionality

  2. Security
    - Maintains email verification security
    - Ensures existing users are not affected
*/

-- First drop the existing email verification trigger
DROP TRIGGER IF EXISTS on_email_verification ON auth.users;

-- Drop any remaining captcha-related functions
DROP FUNCTION IF EXISTS verify_turnstile_token(TEXT);
DROP FUNCTION IF EXISTS verify_captcha_token(TEXT);

-- Remove captcha-related columns from auth.users if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND column_name = 'captcha_verified'
  ) THEN
    ALTER TABLE auth.users DROP COLUMN captcha_verified;
  END IF;
END $$;

-- Create or replace the email verification trigger function
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if email is verified
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
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

-- Recreate the email verification trigger
CREATE TRIGGER on_email_verification
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.handle_email_verification();