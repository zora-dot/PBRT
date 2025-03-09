// Generic error type
export type ErrorType = Error | null;

// Generic API response type
export type ApiResponse<T> = {
  data: T | null;
  error: ErrorType;
};

// Auth types
export interface AuthMetadata {
  provider?: string;
  [key: string]: any;
}

export interface AuthUser {
  id: string;
  email?: string;
  app_metadata: AuthMetadata;
  user_metadata: Record<string, any>;
  email_confirmed_at?: string | null;
}

// Supabase types
export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// Supabase response types with better type safety
// Function types
export type AsyncFunction<T = void> = () => Promise<T>;
export type ErrorHandler = (error: Error) => void;

// Utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// React prop types
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

// Context types
export interface AuthContextType {
  user: Nullable<AuthUser>;
  loading: boolean;
  error: Nullable<Error>;
}

// API types
export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'like' | 'favorite' | 'follow' | 'comment';
  created_at: string;
  is_read: boolean;
  paste_id: string | null;
  comment_id: string | null;
  actor: {
    username: string;
    avatar_url: string | null;
  };
}

// Supabase response types
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count?: number;
  status?: number;
  statusText?: string;
}

// Supabase client options
export interface SupabaseConfig {
  auth: {
    persistSession: boolean;
    autoRefreshToken: boolean;
    detectSessionInUrl: boolean;
    storage?: Storage;
  };
  global?: {
    headers?: Record<string, string>;
  };
  db?: {
    schema?: string;
  };
  realtime?: {
    params?: {
      eventsPerSecond?: number;
    };
  };
}