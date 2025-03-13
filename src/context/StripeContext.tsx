import React, { createContext, useContext } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Replace with your Stripe Public Key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StripeContext = createContext(null);

export const StripeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Elements stripe={stripePromise}>
      <StripeContext.Provider value={null}>{children}</StripeContext.Provider>
    </Elements>
  );
};

export const useStripeContext = () => useContext(StripeContext);