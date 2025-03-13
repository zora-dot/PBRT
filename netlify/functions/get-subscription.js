import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters.userId; // Get userId from query params (authentication can be done via JWT)
    
    // Fetch subscription details from the database
    const { data, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ subscription: data })
    };
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
