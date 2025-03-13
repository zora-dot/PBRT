import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthContext';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  }
);

interface SubscriptionContextType {
  isSupporter: boolean;
  subscription: any;
  loading: boolean;
  error: string | null;
  checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSupporter, setIsSupporter] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const checkSubscriptionStatus = async (retry = false) => {
    if (!user) {
      setIsSupporter(false);
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get both profile and stripe customer data
      const [profileResponse, stripeCustomerResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', user.id)
          .single(),
        supabase
          .from('stripe_customers')
          .select('subscription_status')
          .eq('user_id', user.id)
          .maybeSingle() // Use maybeSingle instead of single to handle no rows case
      ]);

      if (profileResponse.error && profileResponse.error.code !== 'PGRST116') {
        throw profileResponse.error;
      }

      const now = new Date();
      const expiresAt = profileResponse.data?.subscription_expires_at 
        ? new Date(profileResponse.data.subscription_expires_at)
        : null;

      // Check if subscription is active based on both profile and stripe status
      const isActive = profileResponse.data?.subscription_tier === 'SUPPORTER' && 
        (!expiresAt || expiresAt > now) &&
        (!stripeCustomerResponse.data || stripeCustomerResponse.data.subscription_status !== 'canceled');

      setIsSupporter(isActive);
      setSubscription({
        ...profileResponse.data,
        stripeStatus: stripeCustomerResponse.data?.subscription_status
      });
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      setError('Failed to check subscription status');
      setIsSupporter(false);

      // Retry on network errors
      if (retry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          checkSubscriptionStatus(true);
        }, RETRY_DELAY * Math.pow(2, retryCount));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSubscriptionStatus(true);

    // Set up real-time subscription for profile changes
    const subscription = supabase
      .channel('subscription_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: user ? `id=eq.${user.id}` : undefined
        },
        () => {
          checkSubscriptionStatus(false);
        }
      )
      .subscribe();

    // Also listen for stripe_customers changes
    const stripeSubscription = supabase
      .channel('stripe_customer_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stripe_customers',
          filter: user ? `user_id=eq.${user.id}` : undefined
        },
        () => {
          checkSubscriptionStatus(false);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      stripeSubscription.unsubscribe();
    };
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{
      isSupporter,
      subscription,
      loading,
      error,
      checkSubscriptionStatus: () => checkSubscriptionStatus(true)
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};