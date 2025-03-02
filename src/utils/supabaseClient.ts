import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase URL format
const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!isValidUrl(supabaseUrl)) {
  throw new Error('Invalid Supabase URL format');
}

// Create client with automatic retries and better error handling
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: { 'x-application-name': 'pastebin-rich-text' }
  },
  db: {
    schema: 'public'
  },
  // Add retry configuration
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Helper function for retrying failed requests
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error as Error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      // Don't retry if it's not a network/schema error
      if (error instanceof Error && 
          !error.message.includes('Failed to fetch') &&
          !error.message.includes('schema cache')) {
        throw error;
      }
      
      // Wait before retrying, with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Helper function to ensure valid URLs
export function ensureValidUrl(urlString: string, fallbackUrl: string): string {
  try {
    new URL(urlString);
    return urlString;
  } catch (e) {
    console.warn(`Invalid URL detected: ${urlString}, using fallback`);
    return fallbackUrl;
  }
}

// Export the supabase client
export { supabase };