import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, User, Star, Menu, X, DollarSign, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import NotificationsPopover from './NotificationsPopover';
import { supabase } from '../utils/supabaseClient';

interface Profile {
  username: string;
  avatar_url: string | null;
}

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { isSupporter } = useSubscription();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (user) {
      void fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleSignOut = async () => {
    setIsMobileMenuOpen(false); // Close mobile menu first
    
    try {
      await signOut();
      navigate('/');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Failed to sign out');
      console.error('Sign out error:', err);
      // Still navigate home since user is signed out locally
      navigate('/');
    }
  };

  return (
    <nav className="bg-primary-900/50 backdrop-blur-sm border-b border-primary-700 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-24">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img 
                src="/logo.png" 
                alt="Rich Text Logo" 
                className="w-8 h-8 md:w-12 md:h-12"
              />
              <span className="text-lg md:text-xl font-bold text-primary-100">PasteBin Rich Text</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  Dashboard
                </Link>
                <Link
                  to="/favorites"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                  title="Favorites"
                >
                  <Star className="w-5 h-5" />
                </Link>
                <NotificationsPopover />
                {profile && (
                  <div className="flex items-center gap-2">
                    {isSupporter && (
                      <Crown className="w-5 h-5 text-yellow-400 animate-pulse" title="Supporter" />
                    )}
                    <Link
                      to={`/profile/${profile.username}`}
                      className="flex items-center text-primary-100 hover:text-white hover:scale-105 transition-all"
                      title="Profile"
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {profile.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </Link>
                  </div>
                )}
                <Link
                  to="/settings"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <Link
                  to="/pricing"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Pricing</span>
                  </div>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/pricing"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Pricing</span>
                  </div>
                </Link>
                <Link
                  to="/login"
                  className="text-primary-100 hover:text-white hover:scale-105 transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  state={{ isSignUp: true }}
                  className="flex items-center space-x-2 bg-primary-700 hover:bg-primary-600 text-white px-4 py-2 rounded-md transition-all hover:scale-105"
                >
                  <User className="w-4 h-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-primary-100 hover:text-white p-2"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-primary-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/favorites"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Favorites
                  </Link>
                  {profile && (
                    <div className="flex items-center px-3 py-2">
                      {isSupporter && (
                        <Crown className="w-5 h-5 text-yellow-400 mr-2" title="Supporter" />
                      )}
                      <Link
                        to={`/profile/${profile.username}`}
                        className="text-primary-100 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Profile
                      </Link>
                    </div>
                  )}
                  <Link
                    to="/settings"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-primary-100 hover:text-white"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/pricing"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <Link
                    to="/login"
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    state={{ isSignUp: true }}
                    className="block px-3 py-2 text-primary-100 hover:text-white"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}