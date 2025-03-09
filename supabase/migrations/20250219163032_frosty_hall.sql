/*
  # Complete RLS Policies

  1. Changes
    - Add comprehensive RLS policies for all tables
    - Ensure proper access control for all CRUD operations
    - Fix signup issues by adding necessary INSERT policies

  2. Security
    - Secure all tables with appropriate RLS policies
    - Ensure data isolation between users
    - Allow proper public access where needed
*/

-- Folders policies
CREATE POLICY "Users can insert their own folders"
ON folders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON folders FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON folders FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Drafts policies
CREATE POLICY "Users can insert their own drafts"
ON drafts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON drafts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON drafts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Users can view comments on public pastes"
ON comments FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = comments.paste_id
    AND (pastes.is_public = true OR pastes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON comments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Users can view likes on public pastes"
ON likes FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = likes.paste_id
    AND (pastes.is_public = true OR pastes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own likes"
ON likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
ON likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view favorites on public pastes"
ON favorites FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = favorites.paste_id
    AND (pastes.is_public = true OR pastes.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own favorites"
ON favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows"
ON follows FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert their own follows"
ON follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follows"
ON follows FOR DELETE
TO authenticated
USING (auth.uid() = follower_id);

-- Notifications policies
CREATE POLICY "Users can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Shortened URLs policies
CREATE POLICY "Anyone can view shortened URLs"
ON shortened_urls FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert shortened URLs for their pastes"
ON shortened_urls FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = paste_id
    AND pastes.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete shortened URLs for their pastes"
ON shortened_urls FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pastes
    WHERE pastes.id = paste_id
    AND pastes.user_id = auth.uid()
  )
);

-- Stripe customers policies
CREATE POLICY "Users can insert their own stripe customer data"
ON stripe_customers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stripe customer data"
ON stripe_customers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stripe customer data"
ON stripe_customers FOR DELETE
TO authenticated
USING (auth.uid() = user_id);