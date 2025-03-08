import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the hash fragment and convert it to URLSearchParams
        const hashParams = window.location.hash
          ? new URLSearchParams(window.location.hash.substring(1))
          : new URLSearchParams(window.location.search);

        // Get access token and other params
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const providerToken = hashParams.get('provider_token');
        const providerRefreshToken = hashParams.get('provider_refresh_token');

        if (!accessToken) {
          throw new Error('No access token found');
        }

        // Set the session with the tokens
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) throw sessionError;
        if (!session) throw new Error('No session found');

        // Store provider tokens if needed
        if (providerToken) {
          localStorage.setItem('provider_token', providerToken);
        }
        if (providerRefreshToken) {
          localStorage.setItem('provider_refresh_token', providerRefreshToken);
        }

        // Navigate to dashboard
        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_callback_failed', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-primary-100">Completing sign in...</p>
      </div>
    </div>
  );
}