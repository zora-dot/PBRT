import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Crown, CreditCard, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { supabase } from '../utils/supabaseClient';
import AnimatedButton from '../components/AnimatedButton';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';

// Add debounce helper function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export default function Settings() {
  const { user } = useAuth();
  const { subscription, isSupporter } = useSubscription();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [usernameColor, setUsernameColor] = useState('#000000');
  const [usernameBold, setUsernameBold] = useState(false);
  const [usernameItalic, setUsernameItalic] = useState(false);
  const [usernameUnderline, setUsernameUnderline] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  // Add username availability states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [originalUsername, setOriginalUsername] = useState('');
  const usernameDebounceTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setUsername(data.username || '');
      setOriginalUsername(data.username || '');
      setBio(data.bio || '');
      setUsernameColor(data.username_color || '#000000');
      setUsernameBold(data.username_bold || false);
      setUsernameItalic(data.username_italic || false);
      setUsernameUnderline(data.username_underline || false);
      setIsPublic(data.is_public !== false);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user) return;

    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access to supporter features at the end of your current billing period.'
    );

    if (!confirmed) return;

    setIsCanceling(true);
    setCancelError('');
    setCancelSuccess('');

    try {
      const response = await fetch('/.netlify/functions/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      setCancelSuccess(data.message);
      // Format the expiration date nicely
      const expiresAt = new Date(data.expiresAt);
      setCancelSuccess(`Your subscription has been cancelled and will end on ${format(expiresAt, 'MMMM d, yyyy')}`);
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      setCancelError(error.message || 'Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  // Add username availability checker
  const checkUsernameAvailability = async (username: string) => {
    // Don't check if username hasn't changed from original
    if (username === originalUsername) {
      setUsernameAvailable(true);
      setIsCheckingUsername(false);
      return;
    }

    if (!username.trim() || username.length < 3) {
      setUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .ilike('username', username)
        .neq('id', user?.id) // Exclude current user
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

  // Add debounced username change handler
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!usernameAvailable) {
      setError('Please choose a different username');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          username_color: usernameColor,
          username_bold: usernameBold,
          username_italic: usernameItalic,
          username_underline: usernameUnderline,
          updated_at: new Date().toISOString(),
          is_public: isPublic
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSuccess('Profile updated successfully');
      setIsEditingProfile(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      setError(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const predefinedColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
    '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080',
    '#808000', '#800080', '#008080', '#808080', '#C0C0C0'
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <Helmet>
        <title>Customize Your Account - PasteBin Rich Text</title>
        <meta name="description" content="Personalize your PasteBin Rich Text experience. Customize your profile, manage notifications, and update your account preferences." />
        <meta property="og:title" content="Customize Your Account - PasteBin Rich Text" />
        <meta property="og:description" content="Personalize your PasteBin Rich Text experience. Customize your profile, manage notifications, and update your account preferences." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-primary-200">Manage your account preferences</p>
          </div>
          <Link
            to="/profile-settings"
            className="px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
          >
            Security Settings
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">Profile</h2>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Edit Profile
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    placeholder="Choose a username"
                    required
                    disabled={isSubmitting}
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

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username Style
                </label>
                
                <div className="space-y-4">
                  <div className="relative">
                    <label className="block text-sm text-gray-600 mb-1">Username Color</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-gray-200"
                          style={{ backgroundColor: usernameColor }}
                        />
                      </button>
                      {showColorPicker && (
                        <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                          <div className="grid grid-cols-5 gap-1 mb-2">
                            {predefinedColors.map(color => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => {
                                  setUsernameColor(color);
                                  setShowColorPicker(false);
                                }}
                                className="w-6 h-6 rounded-full border border-gray-200"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                          <div className="relative">
                            <input
                              type="text"
                              value={usernameColor}
                              onChange={(e) => setUsernameColor(e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUsernameBold(!usernameBold)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        usernameBold
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-bold">B</span>
                      <span>Bold</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsernameItalic(!usernameItalic)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        usernameItalic
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="italic">I</span>
                      <span>Italic</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsernameUnderline(!usernameUnderline)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        usernameUnderline
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="underline">U</span>
                      <span>Underline</span>
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </label>
                    <span
                      className="text-lg"
                      style={{
                        color: usernameColor,
                        fontWeight: usernameBold ? 'bold' : 'normal',
                        fontStyle: usernameItalic ? 'italic' : 'normal',
                        textDecoration: usernameUnderline ? 'underline' : 'none'
                      }}
                    >
                      {username}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingProfile(false);
                    fetchProfile(); // Reset form
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <AnimatedButton
                  type="submit"
                  disabled={isSubmitting}
                  showSuccess={showSuccess}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </AnimatedButton>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <p className="mt-1 text-gray-900">{username}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{bio || 'No bio set'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username Style
                </label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <span
                    className="text-lg"
                    style={{
                      color: usernameColor,
                      fontWeight: usernameBold ? 'bold' : 'normal',
                      fontStyle: usernameItalic ? 'italic' : 'normal',
                      textDecoration: usernameUnderline ? 'underline' : 'none'
                    }}
                  >
                    {username}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-100 text-green-600 rounded-md">
              {success}
            </div>
          )}
        </div>

        {/* Subscription Section */}
        <div className="bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-primary-500" />
            <h2 className="text-xl font-semibold">Subscription</h2>
          </div>

          <div className="space-y-4">
            {isSupporter ? (
              <>
                <div className="flex items-center gap-2 text-green-600 mb-4">
                  <Crown className="w-5 h-5" />
                  <span className="font-medium">Active Supporter Subscription</span>
                </div>

                {subscription?.subscription_expires_at && (
                  <p className="text-gray-600">
                    Your subscription is active until{' '}
                    {format(new Date(subscription.subscription_expires_at), 'MMMM d, yyyy')}
                  </p>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isCanceling}
                    className="px-4 py-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    {isCanceling ? 'Cancelling...' : 'Cancel Subscription'}
                  </button>
                </div>

                {cancelError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                    {cancelError}
                  </div>
                )}

                {cancelSuccess && (
                  <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-md">
                    {cancelSuccess}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  You are currently on the free plan. Upgrade to Supporter to unlock premium features!
                </p>

                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  <DollarSign className="w-5 h-5" />
                  View Pricing
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}