-- Create a function to get daily paste count
CREATE OR REPLACE FUNCTION get_daily_paste_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Get today's date at midnight in UTC
  WITH day_bounds AS (
    SELECT 
      date_trunc('day', now()) AS day_start,
      date_trunc('day', now()) + interval '1 day' AS day_end
  )
  
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM pastes p, day_bounds d
  WHERE p.user_id = user_id_param
  AND p.created_at >= d.day_start
  AND p.created_at < d.day_end
  AND p.deleted_at IS NULL;
  
  RETURN v_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_daily_paste_count(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_daily_paste_count IS 
'Gets the count of pastes created by a user on the current day';