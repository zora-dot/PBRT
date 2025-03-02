import { createClient } from '@supabase/supabase-js';
import type { SupabaseResponse, ErrorType, ApiResponse } from '../types';
import { handleError } from './common';

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
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce'
  },
  global: {
    headers: { 'x-application-name': 'pastebin-rich-text' }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Create a channel for handling realtime errors
const errorChannel = supabase.channel('error_channel')
  .on('system', { event: '*' }, (payload) => {
    if (payload.type === 'system_error') {
      console.error('Realtime system error:', payload);
    }
  })
  .subscribe();

// Helper function to determine if error is retryable
const isRetryableError = (error: ErrorType): boolean => {
  if (!error) return false;
  
  // Network errors
  if (error.message.includes('Failed to fetch')) return true;
  
  // Rate limit errors
  if (error.message.includes('Too many requests')) return true;
  
  // Connection errors
  if (error.message.includes('connection')) return true;
  
  // Timeout errors
  if (error.message.includes('timeout')) return true;
  
  // Schema errors (can occur during initial connection)
  if (error.message.includes('schema')) return true;
  
  return false;
};

// Helper function for retrying failed requests
export async function withRetry<T extends SupabaseResponse<any>>(
  operation: () => Promise<T>, 
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 200;
    const delay = baseDelay * Math.pow(2, attempt) + jitter;

    try {
      const result = await operation();
      
      // Check for Supabase errors
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result;
    } catch (error) {
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      lastError = error instanceof Error ? error : new Error('Operation failed');
      if (!isRetryableError(lastError)) throw error;
      
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      console.info(`Retrying in ${Math.round(delay)}ms...`);
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

// Helper function to handle Supabase responses with better error handling
export async function handleSupabaseResponse<T>(
  operation: () => Promise<ApiResponse<T>>
): Promise<T> {
  try {
    const { data, error } = await withRetry(operation);
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data) {
      throw new Error('No data returned');
    }
    
    return data;
  } catch (error) {
    throw handleError(error);
  }
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