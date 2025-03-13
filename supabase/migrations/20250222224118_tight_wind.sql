-- Create function to sync subscription tier with stripe customers
CREATE OR REPLACE FUNCTION sync_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if subscription_tier has changed
  IF OLD.subscription_tier = NEW.subscription_tier THEN
    RETURN NEW;
  END IF;

  -- Update stripe_customers status based on subscription tier
  UPDATE stripe_customers
  SET subscription_status = 
    CASE 
      WHEN NEW.subscription_tier = 'SUPPORTER' THEN 'active'
      ELSE 'inactive'
    END,
    updated_at = NOW()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription tier sync
DROP TRIGGER IF EXISTS on_subscription_tier_change ON profiles;
CREATE TRIGGER on_subscription_tier_change
  AFTER UPDATE OF subscription_tier ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_tier();

-- Add subscription_status column to stripe_customers if it doesn't exist
ALTER TABLE stripe_customers 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);

-- Update existing stripe_customers based on current subscription tiers
UPDATE stripe_customers sc
SET 
  subscription_status = 
    CASE 
      WHEN p.subscription_tier = 'SUPPORTER' THEN 'active'
      ELSE 'inactive'
    END,
  updated_at = NOW()
FROM profiles p
WHERE sc.user_id = p.id;

-- Add RLS policy for stripe_customers subscription_status
DROP POLICY IF EXISTS "Users can view their own stripe customer status" ON stripe_customers;
CREATE POLICY "Users can view their own stripe customer status"
ON stripe_customers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT UPDATE ON stripe_customers TO service_role;