import { loadStripe } from '@stripe/stripe-js';

// Make sure to add your publishable key to the .env file
export const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);