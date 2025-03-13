-- Create a more robust function to get daily paste count
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
      date_trunc('day', now() AT TIME ZONE 'UTC') AS day_start,
      date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' AS day_end
  )
  
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM pastes p, day_bounds d
  WHERE p.user_id = user_id_param
  AND p.created_at >= d.day_start
  AND p.created_at < d.day_end
  AND p.deleted_at IS NULL;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Create a function to count all pastes for a user
CREATE OR REPLACE FUNCTION count_user_pastes(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM pastes
  WHERE user_id = user_id_param
  AND deleted_at IS NULL;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_daily_paste_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION count_user_pastes(UUID) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_daily_paste_count IS 
'Gets the count of pastes created by a user on the current day';

COMMENT ON FUNCTION count_user_pastes IS
'Gets the total count of non-deleted pastes for a user';