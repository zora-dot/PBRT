-- Create function to get or create short URL
CREATE OR REPLACE FUNCTION get_or_create_short_url(
  p_paste_id UUID,
  p_full_original_url TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_short_domain TEXT;
  v_short_id TEXT;
  v_full_short_url TEXT;
  v_existing_url TEXT;
BEGIN
  -- Get short domain from environment variable or use default
  v_short_domain := current_setting('app.settings.short_domain', true);
  IF v_short_domain IS NULL THEN
    v_short_domain := 'https://pb-rt.com';
  END IF;

  -- Check if a short URL already exists for this paste
  SELECT full_short_url INTO v_existing_url
  FROM shortened_urls
  WHERE paste_id = p_paste_id
  LIMIT 1;

  -- If a short URL exists, return it
  IF v_existing_url IS NOT NULL THEN
    RETURN v_existing_url;
  END IF;

  -- Generate new short ID
  v_short_id := substr(md5(random()::text), 1, 6);

  -- Create full short URL
  v_full_short_url := v_short_domain || '/' || v_short_id;

  -- Create new shortened URL
  INSERT INTO shortened_urls (
    paste_id,
    short_id,
    full_original_url,
    full_short_url
  ) VALUES (
    p_paste_id,
    v_short_id,
    p_full_original_url,
    v_full_short_url
  );

  RETURN v_full_short_url;
END;
$$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shortened_urls_paste_id 
ON shortened_urls(paste_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_or_create_short_url(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_short_url(UUID, TEXT) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION get_or_create_short_url IS 
'Gets existing short URL for a paste or creates a new one if none exists';