import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail as MailIcon, Key, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import PasswordRequirements from '../components/PasswordRequirements';
import { supabase } from '../utils/supabaseClient';

// Helper function to format provider name
const formatProviderName = (provider: string): string => {
  switch (provider.toLowerCase()) {
    case 'email':
      return 'email';
    case 'google':
      return 'Google';
    case 'github':
      return 'GitHub';
    default:
      return provider.toLowerCase();
  }
};

interface Profile {
  has_password: boolean;
}

export default function ProfileSettings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  // Account deletion states
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfile(true);
  }, [user, navigate]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchProfile = async (retry = false) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('has_password')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      
      if (retry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        await delay(RETRY_DELAY * Math.pow(2, retryCount));
        return fetchProfile(true);
      }
      
      setPasswordError('Failed to load profile settings. Please try again.');
    }
    setRetryCount(0);
  };

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !emailPassword) {
      setEmailError('Please fill in all required fields');
      return;
    }

    setIsEmailSubmitting(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      // Check if user signed up with a social provider
      const provider = user?.app_metadata?.provider;
      if (provider && provider !== 'email') {
        throw new Error(`Please manage your email through your ${provider} account settings`);
      }

      const { error } = await supabase.auth.updateUser(
        { email: newEmail },
        { currentPassword: emailPassword }
      );

      if (error) throw error;

      setEmailSuccess('Verification email sent to your new email address');
      setNewEmail('');
      setEmailPassword('');
    } catch (error: any) {
      setEmailError(error.message || 'Failed to update email');
      if (error.message?.includes('Failed to fetch')) {
        setEmailError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      setPasswordError('Please fill in all required fields');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    setIsPasswordSubmitting(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      // Call RPC function to update password
      const { error: rpcError } = await supabase.rpc('update_user_password', {
        user_id: user?.id,
        new_password: newPassword,
        current_password: profile?.has_password ? currentPassword : null
      });

      if (rpcError) throw rpcError;

      setPasswordSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      
      // Refresh profile to update has_password status
      await fetchProfile();
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
      if (error.message?.includes('Failed to fetch')) {
        setPasswordError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile?.has_password && !deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.'
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      // First verify the password if required
      if (profile?.has_password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user?.email || '',
          password: deletePassword
        });

        if (signInError) throw new Error('Invalid password');
      }

      // Delete the user's profile and data
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user?.id);

      if (deleteError) throw deleteError;

      // Sign out and redirect
      await signOut();
      navigate('/');
    } catch (error: any) {
      setDeleteError(error.message || 'Failed to delete account');
      if (error.message?.includes('Failed to fetch')) {
        setDeleteError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Check if user signed up with a social provider
  const provider = user?.app_metadata?.provider;
  const formattedProvider = provider ? formatProviderName(provider) : null;
  const isEmailProvider = !provider || provider === 'email';

  return (
    <>
      <Helmet>
        <title>Security Settings - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-2xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Security Settings</h1>
              <p className="text-primary-200">
                {user?.email && (
                  <span className="flex items-center gap-2">
                    <MailIcon className="w-4 h-4" />
                    {user.email}
                  </span>
                )}
              </p>
            </div>
            <Link
              to="/settings"
              className="px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
            >
              Account Settings
            </Link>
          </div>
        </div>

        {(emailError || passwordError || deleteError) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {emailError || passwordError || deleteError}
          </div>
        )}

        {(emailSuccess || passwordSuccess) && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-600 rounded-md">
            {emailSuccess || passwordSuccess}
          </div>
        )}

        <div className="space-y-6">
          {/* Change Email Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-8">
              <MailIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">Change Email</h2>
            </div>

            {!isEmailProvider ? (
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-800">Email changes not available</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      Since you signed up with {formattedProvider}, you cannot change your email address directly. 
                      Please manage your email through your {formattedProvider} account settings.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
                    New Email
                  </label>
                  <input
                    type="email"
                    id="newEmail"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="emailPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="emailPassword"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isEmailSubmitting}
                  className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {isEmailSubmitting ? 'Updating...' : 'Update Email'}
                </button>

                {emailError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                    {emailError}
                  </div>
                )}

                {emailSuccess && (
                  <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-md">
                    {emailSuccess}
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Key className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold">
                {profile?.has_password ? 'Change Password' : 'Set Password'}
              </h2>
            </div>

            {formattedProvider && !profile?.has_password && (
              <div className={`p-4 ${
                formattedProvider === 'email' ? 'hidden' : 'bg-blue-50 border border-blue-100 rounded-md mb-6'
              }`}>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">First Time Password Setup</h3>
                    <p className="text-blue-700 text-sm mt-1">
                      Since you signed up with {formattedProvider}, you can optionally set up a password.
                      This will allow you to sign in with either your {formattedProvider} account or your
                      email/username and password.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {profile?.has_password && (
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  {profile?.has_password ? 'New Password' : 'Set Password'}
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  minLength={6}
                />
                <PasswordRequirements password={newPassword} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm {profile?.has_password ? 'New ' : ''}Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isPasswordSubmitting}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isPasswordSubmitting ? 'Updating...' : profile?.has_password ? 'Update Password' : 'Set Password'}
              </button>

              {passwordError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                  {passwordError}
                </div>
              )}

              {passwordSuccess && (
                <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-md">
                  {passwordSuccess}
                </div>
              )}
            </form>
          </div>

          {/* Delete Account Section */}
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h2 className="text-xl font-semibold">Delete Account</h2>
            </div>

            <p className="text-gray-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {profile?.has_password && (
                <div>
                  <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-700">
                    Enter your password to confirm account deletion
                  </label>
                  <input
                    type="password"
                    id="deletePassword"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isDeleting}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>

              {deleteError && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                  {deleteError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </>
  );
}