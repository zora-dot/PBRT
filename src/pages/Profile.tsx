import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Users, FileText, Share2, Edit2, Folder, MessageSquare, User } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import FollowButton from '../components/FollowButton';
import SupporterBadge from '../components/SupporterBadge';
import { useAuth } from '../context/AuthContext';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';
import ShareDialog from '../components/ShareDialog';
import OpenGraph from '../components/OpenGraph';
import SkeletonLoader from '../components/SkeletonLoader';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  subscription_tier: string;
  username_color?: string;
  username_bold?: boolean;
  username_italic?: boolean;
  username_underline?: boolean;
}

interface Paste {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  is_public: boolean;
  user_id: string;
  folder_id: string | null;
  custom_url: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  favorites_count: number;
  likes_count?: number;
  comments_count?: number;
}

interface Stats {
  followers: number;
  following: number;
  pastes: number;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [stats, setStats] = useState<Stats>({ followers: 0, following: 0, pastes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'favorites'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile?.id) {
      fetchPastes();
    }
  }, [profile?.id, page, perPage, sortBy, sortOrder]);

  const fetchProfile = async () => {
    if (!username) return;

    try {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw new Error('Profile not found');
      }

      if (!profileData) {
        throw new Error('Profile not found');
      }

      setProfile(profileData);

      try {
        const [followersData, followingData, pastesData] = await Promise.all([
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', profileData.id),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileData.id),
          supabase
            .from('pastes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileData.id)
            .eq('is_public', true)
        ]);

        setStats({
          followers: followersData.count || 0,
          following: followingData.count || 0,
          pastes: pastesData.count || 0
        });
      } catch (statsError) {
        console.error('Stats error:', statsError);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchPastes = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('pastes')
        .select(`
          *,
          folder:folders!pastes_folder_id_fkey (
            id,
            name
          )
        `)
        .eq('user_id', profile.id)
        .eq('is_public', true)
        .is('deleted_at', null);

      switch (sortBy) {
        case 'likes':
          query = query.order('likes_count', { ascending: sortOrder === 'asc', nullsFirst: false });
          break;
        case 'favorites':
          query = query.order('favorites_count', { ascending: sortOrder === 'asc', nullsFirst: false });
          break;
        default:
          query = query.order('created_at', { ascending: sortOrder === 'asc' });
      }

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const now = new Date();
      const validPastes = (data || []).filter(paste => {
        return !paste.expires_at || new Date(paste.expires_at) > now;
      });

      setPastes(validPastes);
      setTotalPages(Math.ceil((count || 0) / perPage));
    } catch (error) {
      console.error('Error fetching pastes:', error);
      setPastes([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (pasteId: string) => {
    setSelectedPasteId(pasteId);
    setIsShareDialogOpen(true);
  };

  const getUsernameStyle = () => {
    return {
      color: profile?.username_color || '#000000',
      fontWeight: profile?.username_bold ? 'bold' : 'normal',
      fontStyle: profile?.username_italic ? 'italic' : 'normal',
      textDecoration: profile?.username_underline ? 'underline' : 'none'
    };
  };

  if (loading && !profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="space-y-6">
          <SkeletonLoader className="h-64 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-6">
            <SkeletonLoader className="h-24 w-full rounded-lg" />
            <SkeletonLoader className="h-24 w-full rounded-lg" />
            <SkeletonLoader className="h-24 w-full rounded-lg" />
          </div>
          <div className="space-y-4">
            <SkeletonLoader className="h-32 w-full rounded-lg" />
            <SkeletonLoader className="h-32 w-full rounded-lg" />
            <SkeletonLoader className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
          {error || 'Profile not found'}
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <>
      <OpenGraph
        title={`${profile.username}'s Profile - PasteBin Rich Text`}
        description={`View ${profile.username}'s pastes and activity on PasteBin Rich Text${
          profile.bio ? `: ${profile.bio}` : ''
        }`}
        image={profile.avatar_url || '/logo.png'}
        type="profile"
      />

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary-600 to-primary-700"></div>
          <div className="px-6 py-4 sm:px-8 sm:py-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div className="sm:flex sm:space-x-5">
                <div className="flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username}
                      className="mx-auto h-20 w-20 rounded-full border-4 border-white -mt-10 relative z-10 object-cover"
                    />
                  ) : (
                    <div className="mx-auto h-20 w-20 rounded-full border-4 border-white -mt-10 relative z-10 bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-white">
                        {profile.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold" style={getUsernameStyle()}>
                      {profile.username}
                    </h1>
                    <div className="flex items-center gap-2">
                      {profile.subscription_tier === 'SUPPORTER' && (
                        <SupporterBadge size="md" />
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-gray-600 mt-1 break-words max-w-prose">
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-0">
                <FollowButton userId={profile.id} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-6 text-center">
              <Link
                to={`/profile/${username}/followers`}
                className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.followers}</p>
                <p className="text-sm text-gray-500">Followers</p>
              </Link>
              <Link
                to={`/profile/${username}/following`}
                className="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.following}</p>
                <p className="text-sm text-gray-500">Following</p>
              </Link>
              <div className="bg-gray-50 p-4 rounded-lg">
                <FileText className="w-6 h-6 text-primary-500 mx-auto mb-2" />
                <p className="text-2xl font-semibold text-gray-900">{stats.pastes}</p>
                <p className="text-sm text-gray-500">Public Pastes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Public Pastes</h2>
            <div className="flex items-center gap-4">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-1 bg-white rounded-md border border-gray-300"
              >
                <option value="10">10 per page</option>
                <option value="25">25 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['date' | 'likes' | 'favorites', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                  setPage(1);
                }}
                className="px-3 py-1 bg-white rounded-md border border-gray-300"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="likes-desc">Most Likes</option>
                <option value="likes-asc">Least Likes</option>
                <option value="favorites-desc">Most Favorites</option>
                <option value="favorites-asc">Least Favorites</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {pastes.length === 0 ? (
              <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
                <FileText className="w-12 h-12 text-primary-300 mx-auto mb-4" />
                <p className="text-lg text-primary-200">No public pastes yet</p>
              </div>
            ) : (
              pastes.map((paste) => (
                <div
                  key={paste.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Link
                        to={`/paste/${paste.id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {paste.title || 'Untitled Paste'}
                      </Link>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleShare(paste.id)}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-5 h-5 text-primary-500" />
                        </button>
                        {user?.id === paste.user_id && (
                          <Link
                            to={`/paste/${paste.id}/edit`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            title="Edit paste"
                          >
                            <Edit2 className="w-5 h-5 text-primary-500" />
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 mb-4">
                      <LikeButton pasteId={paste.id} />
                      <FavoriteButton pasteId={paste.id} />
                      <Link
                        to={`/paste/${paste.id}#comments`}
                        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>{paste.comments_count || 0}</span>
                      </Link>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="text-emerald-700">Created: {format(new Date(paste.created_at), 'MMM dd, yyyy HH:mm')}</div>
                      {paste.expires_at && (
                        <div className="text-orange-700">Expires: {format(new Date(paste.expires_at), 'MMM dd, yyyy HH:mm')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-4">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 text-primary-100 hover:text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-primary-100">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 text-primary-100 hover:text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedPasteId && (
        <ShareDialog
          isOpen={isShareDialogOpen}
          onClose={() => {
            setIsShareDialogOpen(false);
            setSelectedPasteId(null);
          }}
          url={`${window.location.origin}/p/${selectedPasteId}`}
          title={pastes.find(p => p.id === selectedPasteId)?.title || 'Untitled Paste'}
        />
      )}
    </>
  );
}