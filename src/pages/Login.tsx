import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Github, Chrome, RefreshCw, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import PasswordRequirements from '../components/PasswordRequirements';
import { supabase } from '../utils/supabaseClient';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(location.state?.isSignUp || false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [lastResendTime, setLastResendTime] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const usernameDebounceTimeout = useRef<NodeJS.Timeout>();

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  };

  const socialButtonVariants = {
    initial: { y: 0, opacity: 1 },
    hover: { y: -2, opacity: 1 },
    tap: { y: 1, opacity: 0.9 },
  };

  useEffect(() => {
    // Start cooldown timer if needed
    if (lastResendTime > 0) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, 300000 - (now - lastResendTime)); // 5 minutes cooldown
        setResendCooldown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastResendTime]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim() || username.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username)
        .maybeSingle();

      if (error) throw error;
      setUsernameAvailable(!data);
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);

    // Clear any existing timeout
    if (usernameDebounceTimeout.current) {
      clearTimeout(usernameDebounceTimeout.current);
    }

    // Set new timeout for username check
    usernameDebounceTimeout.current = setTimeout(() => {
      checkUsernameAvailability(newUsername);
    }, 500);
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const now = Date.now();
    if (now - lastResendTime < 300000) { // 5 minutes cooldown
      return;
    }

    setIsResendingVerification(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;

      setSuccess('Verification email has been resent. Please check your inbox.');
      setLastResendTime(now);
      setResendCooldown(300);
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email');
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: provider === 'google' ? {
            access_type: 'offline',
            prompt: 'consent',
          } : undefined,
          scopes: provider === 'github' ? 'read:user user:email' : undefined
        }
      });

      if (error) throw error;
      
      console.log('OAuth initiated:', data);
    } catch (error: any) {
      console.error('Social login error:', error);
      setError(error.message || 'Failed to initialize social login');
    }
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim() && !username.trim()) {
      setError('Please enter your email or username');
      return false;
    }
    if (email.trim() && !emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!isForgotPassword && !password) {
      setError('Please enter your password');
      return false;
    }
    if (isSignUp) {
      if (!username.trim()) {
        setError('Please enter a username');
        return false;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) throw error;
      setSuccess('Password reset instructions have been sent to your email');
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset instructions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (isSignUp) {
        await signUp(email.trim(), password, username.trim());
        setVerificationEmail(email.trim());
        setVerificationSent(true);
        resetForm();
      } else {
        try {
          await signIn(email.trim(), password);
        } catch (error: any) {
          if (error.message.includes('Email not confirmed')) {
            setShowResendVerification(true);
            setVerificationEmail(email.trim());
            throw error;
          }
          // If email sign-in fails, try username
          if (username.trim()) {
            await signIn(username.trim(), password);
          } else {
            throw error;
          }
        }
        resetForm();
        navigate('/dashboard');
      }
    } catch (error: any) {
      setError(error.message || 'An unexpected error occurred. Please try again.');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to {verificationEmail}. Please check your inbox and click the link to verify your account.
            </p>
            <div className="space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isResendingVerification}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isResendingVerification ? 'animate-spin' : ''}`} />
                {resendCooldown > 0
                  ? `Resend available in ${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')}`
                  : isResendingVerification
                  ? 'Sending...'
                  : 'Resend verification email'}
              </button>
              <button
                onClick={() => {
                  setVerificationSent(false);
                  setIsSignUp(false);
                  resetForm();
                }}
                className="text-primary-600 hover:text-primary-700"
              >
                Return to sign in
              </button>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-4 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{isSignUp ? 'Create Your Account' : 'Welcome Back'} - PasteBin Rich Text</title>
        <meta 
          name="description" 
          content={isSignUp 
            ? "Join PasteBin Rich Text and start sharing your content with the world. Create an account to access all features." 
            : "Welcome back to PasteBin Rich Text. Sign in to access your pastes, folders, and continue sharing content."
          } 
        />
        <meta 
          property="og:title" 
          content={`${isSignUp ? 'Create Your Account' : 'Welcome Back'} - PasteBin Rich Text`} 
        />
        <meta 
          property="og:description" 
          content={isSignUp 
            ? "Join PasteBin Rich Text and start sharing your content with the world. Create an account to access all features." 
            : "Welcome back to PasteBin Rich Text. Sign in to access your pastes, folders, and continue sharing content."
          } 
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <motion.div 
              className="flex items-center justify-center mb-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <img 
                src="/logo.png" 
                alt="Rich Text Logo" 
                className="w-15 h-15"
                style={{ width: '15rem', height: '15rem', objectFit: 'contain' }}
              />
            </motion.div>
            <motion.h1 
              className="text-3xl font-bold text-white mb-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {isForgotPassword 
                ? 'Reset Password'
                : isSignUp 
                  ? 'Create Account' 
                  : 'Welcome Back'}
            </motion.h1>
            <motion.p 
              className="text-primary-200"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {isForgotPassword
                ? 'Enter your email to receive reset instructions'
                : isSignUp
                  ? 'Create an account to start sharing your pastes'
                  : 'Sign in to access your pastes'}
            </motion.p>
          </div>

          <motion.div 
            className="bg-white rounded-lg shadow-xl p-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm">
                {error}
                {showResendVerification && (
                  <div className="mt-2">
                    <button
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || isResendingVerification}
                      className="text-red-600 hover:text-red-700 underline focus:outline-none"
                    >
                      Resend verification email
                    </button>
                  </div>
                )}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-md text-sm">
                {success}
              </div>
            )}

            {!isForgotPassword && (
              <div className="space-y-4 mb-8">
                <motion.button
                  variants={socialButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleSocialLogin('google')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Chrome className="w-5 h-5 text-red-500" />
                  <span>Continue with Google</span>
                </motion.button>
                <motion.button
                  variants={socialButtonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleSocialLogin('github')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span>Continue with GitHub</span>
                </motion.button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-6">
              {!isSignUp && (
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username || email}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.includes('@')) {
                        setEmail(value);
                        setUsername('');
                      } else {
                        setUsername(value);
                        setEmail('');
                      }
                      setError('');
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    required
                    disabled={isSubmitting}
                    placeholder="Enter your username or email"
                  />
                </div>
              )}

              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                      }}
                      className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                      required
                      autoComplete="email"
                      disabled={isSubmitting}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={handleUsernameChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                          isCheckingUsername 
                            ? 'border-gray-300 focus:ring-gray-200'
                            : usernameAvailable
                              ? 'border-green-300 focus:ring-green-200'
                              : 'border-red-300 focus:ring-red-200'
                        }`}
                        required
                        disabled={isSubmitting}
                        placeholder="Choose a username"
                      />
                      {username && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {isCheckingUsername ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-primary-500" />
                          ) : usernameAvailable ? (
                            <div className="text-green-500">✓</div>
                          ) : (
                            <div className="text-red-500">✗</div>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      Username must be 3-15 characters and can only contain letters, numbers, underscores, and hyphens.
                      {username && !usernameAvailable && !isCheckingUsername && (
                        <span className="text-red-500 block mt-1">
                          This username is already taken
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}

              {!isForgotPassword && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    required
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  />
                  {isSignUp && <PasswordRequirements password={password} />}
                </div>
              )}

              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-primary-500 focus:ring focus:ring-primary-200"
                    required
                    autoComplete="new-password"
                    minLength={6}
                    disabled={isSubmitting}
                    placeholder="Confirm your password"
                  />
                </div>
              )}
              
              <div className="space-y-4">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  className={`w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                    isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting 
                    ? 'Please wait...' 
                    : isForgotPassword
                      ? 'Send Reset Instructions'
                      : isSignUp 
                        ? 'Create Account' 
                        : 'Sign In'}
                </motion.button>

                {isForgotPassword && (
                  <motion.button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                    variants={buttonVariants}
                    initial="initial"
                    whileHover="hover"
                    whileTap="tap"
                    className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 py-2 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Sign In
                  </motion.button>
                )}
              </div>
            </form>

            {!isForgotPassword && (
              <div className="mt-8 text-center">
                <motion.button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    resetForm();
                    setIsForgotPassword(false);
                  }}
                  disabled={isSubmitting}
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium py-2 block w-full mb-6"
                >
                  {isSignUp
                    ? 'Already have an account? Sign in'
                    : "Don't have an account? Sign up"}
                </motion.button>

                {!isSignUp && (
                  <div className="space-y-2">
                    <motion.button
                      onClick={() => {
                        setIsForgotPassword(!isForgotPassword);
                        resetForm();
                        setIsSignUp(false);
                      }}
                      disabled={isSubmitting}
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium py-1 block w-full"
                    >
                      {isForgotPassword
                        ? 'Back to sign in'
                        : 'Forgot your password?'}
                    </motion.button>

                    <motion.button
                      onClick={handleResendVerification}
                      disabled={resendCooldown > 0 || isResendingVerification}
                      variants={buttonVariants}
                      initial="initial"
                      whileHover="hover"
                      whileTap="tap"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium py-1 block w-full"
                    >
                      {resendCooldown > 0
                        ? `Resend available in ${Math.floor(resendCooldown / 60)}:${(resendCooldown % 60).toString().padStart(2, '0')}`
                        : 'Resend verification email'}
                    </motion.button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}