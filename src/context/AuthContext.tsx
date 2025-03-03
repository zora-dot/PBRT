import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase, withRetry } from '../utils/supabaseClient';

interface AuthContextType {
  user: User | null;
  isAnonymous: boolean;
  signIn: (emailOrUsername: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  resendVerificationEmail: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const LOGIN_ATTEMPTS_KEY = 'login_attempts';
const LOGIN_LOCKOUT_KEY = 'login_lockout_until';
const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface LoginAttempts {
  count: number;
  firstAttempt: number;
}

const getLoginAttempts = (): LoginAttempts => {
  const stored = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
  return stored ? JSON.parse(stored) : { count: 0, firstAttempt: Date.now() };
};

const setLoginAttempts = (attempts: LoginAttempts) => {
  localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(attempts));
};

const resetLoginAttempts = () => {
  localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
  localStorage.removeItem(LOGIN_LOCKOUT_KEY);
};

const isLockedOut = (): boolean => {
  const lockoutUntil = localStorage.getItem(LOGIN_LOCKOUT_KEY);
  if (!lockoutUntil) return false;
  
  const lockoutTime = parseInt(lockoutUntil, 10);
  return Date.now() < lockoutTime;
};

const checkLoginAttempts = () => {
  if (isLockedOut()) {
    const lockoutUntil = parseInt(localStorage.getItem(LOGIN_LOCKOUT_KEY)!, 10);
    const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60);
    throw new Error(`Too many login attempts. Please try again in ${remainingTime} minutes.`);
  }

  const attempts = getLoginAttempts();
  const now = Date.now();

  if (now - attempts.firstAttempt > LOCKOUT_DURATION) {
    resetLoginAttempts();
    return;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    localStorage.setItem(LOGIN_LOCKOUT_KEY, (now + LOCKOUT_DURATION).toString());
    resetLoginAttempts();
    throw new Error('Too many login attempts. Please try again in 60 minutes.');
  }

  setLoginAttempts({
    count: attempts.count + 1,
    firstAttempt: attempts.firstAttempt || now,
  });
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get the current session with retry
        const { data: { session }, error: sessionError } = await withRetry(() =>
          supabase.auth.getSession()
        );
        
        if (sessionError) throw sessionError;

        if (mounted) {
          if (session?.user) {
            if (session.user.email_confirmed_at) {
              setUser(session.user);
              setIsAnonymous(false);
            } else {
              await supabase.auth.signOut();
              setUser(null);
              setIsAnonymous(false);
            }
          } else {
            setUser(null);
            setIsAnonymous(false);
          }
          setLoading(false);
        }

        // Set up session refresh
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          if (event === 'TOKEN_REFRESHED') {
            // Successfully refreshed the session
            if (session?.user) {
              setUser(session.user);
            }
          } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            setUser(null);
            // Clear any stored auth data
            localStorage.removeItem('supabase.auth.token');
          } else if (session?.user) {
            if (session.user.email_confirmed_at) {
              setUser(session.user);
              setIsAnonymous(false);
              resetLoginAttempts();
            } else {
              await supabase.auth.signOut();
              setUser(null);
              setIsAnonymous(false);
              throw new Error('Please verify your email before signing in.');
            }
          } else {
            setUser(null);
            setIsAnonymous(false);
          }
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to initialize auth');
        console.error('Error initializing auth:', err);
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await withRetry(() =>
        supabase.auth.resend({
          type: 'signup',
          email,
          options: {
            emailRedirectTo: window.location.origin
          }
        })
      );

      if (error) throw error;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to resend verification email');
    }
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      checkLoginAttempts();

      if (!emailOrUsername.trim() || !password) {
        throw new Error('Please enter both email/username and password.');
      }

      // First try direct email login if input looks like an email
      if (emailOrUsername.includes('@')) {
        const { data, error } = await withRetry(() =>
          supabase.auth.signInWithPassword({
            email: emailOrUsername.trim(),
            password
          })
        );

        if (!error) {
          if (data.user && !data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            throw new Error('Please verify your email before signing in.');
          }
          resetLoginAttempts();
          return;
        }
      }

      // If email login failed or input wasn't an email, try username login
      const { data: userData, error: userError } = await withRetry(() =>
        supabase.rpc('get_user_by_username', {
          p_username: emailOrUsername.trim()
        })
      );

      if (userError) {
        throw new Error('The email/username or password you entered is incorrect.');
      }

      if (!userData || userData.length === 0 || !userData[0].email) {
        throw new Error('The email/username or password you entered is incorrect.');
      }

      const userInfo = userData[0];
      if (!userInfo.is_confirmed) {
        throw new Error('Please verify your email before signing in.');
      }

      // Try login with the found email
      const { data, error: signInError } = await withRetry(() =>
        supabase.auth.signInWithPassword({
          email: userInfo.email,
          password
        })
      );

      if (signInError) {
        throw new Error('The email/username or password you entered is incorrect.');
      }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        throw new Error('Please verify your email before signing in.');
      }

      resetLoginAttempts();
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.message) {
          case 'Invalid login credentials':
            throw new Error('The email/username or password you entered is incorrect.');
          case 'Email not confirmed':
            throw new Error('Please verify your email address before signing in.');
          default:
            throw new Error(error.message);
        }
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      if (!email.trim() || !password || !username.trim()) {
        throw new Error('Please fill in all required fields.');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,14}$/;
      if (!usernameRegex.test(username)) {
        throw new Error('Username must be 3-15 characters and can only contain letters, numbers, underscores, and hyphens');
      }

      // Check if username is available
      const { data: existingUser, error: checkError } = await withRetry(() =>
        supabase
          .from('profiles')
          .select('username')
          .ilike('username', username)
          .maybeSingle()
      );

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        throw new Error('This username is already taken');
      }

      // Sign up the user
      const { error } = await withRetry(() =>
        supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              username: username.trim(),
              display_name: username.trim() // Add display_name to match username
            }
          }
        })
      );

      if (error) throw error;

      // Show verification message
      throw new Error('Please check your email to verify your account.');
    } catch (error: any) {
      if (error instanceof AuthError) {
        switch (error.message) {
          case 'User already registered':
            throw new Error('An account with this email already exists. Please sign in instead.');
          case 'Password should be at least 6 characters':
            throw new Error('Password must be at least 6 characters long.');
          default:
            throw new Error(error.message);
        }
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // First try to sign out from Supabase
      const { error } = await withRetry(async () => {
        return await supabase.auth.signOut();
      }, 3, 1000);

      // Clear local state and storage regardless of Supabase response
      setUser(null);
      setIsAnonymous(false);
      localStorage.clear(); // Clear all local storage to ensure complete cleanup

      // Only throw non-session errors
      if (error && !error.message?.includes('session')) {
        console.error('Non-critical sign out error:', error);
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Ensure user is signed out locally even if Supabase call fails
      setUser(null);
      setIsAnonymous(false);
      localStorage.clear();
    }
  };

  const signInAnonymously = () => {
    setIsAnonymous(true);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAnonymous,
      signIn, 
      signUp, 
      signOut,
      loading,
      resendVerificationEmail,
      signInAnonymously
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};