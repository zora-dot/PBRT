/*
  # Add Profile Privacy

  1. Changes
    - Add is_public column to profiles table with default true
    - Update existing profiles to be public by default
    - Add index for better query performance

  2. Security
    - Update RLS policies to respect privacy settings
*/

-- Add is_public column with default true
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public);

-- Update existing profiles to be public by default
UPDATE profiles SET is_public = true WHERE is_public IS NULL;

-- Update profile view policy to respect privacy settings
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable based on privacy settings"
ON profiles FOR SELECT
TO public
USING (
  is_public = true OR 
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM pastes 
    WHERE pastes.user_id = profiles.id 
    AND pastes.is_public = true
  )
);

-- Update paste view policy to respect profile privacy
DROP POLICY IF EXISTS "Public pastes are viewable by everyone" ON pastes;
CREATE POLICY "Pastes are viewable based on privacy settings"
ON pastes FOR SELECT
TO public
USING (
  is_public = true OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = pastes.user_id
    AND profiles.is_public = true
  )
);