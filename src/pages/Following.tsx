import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserMinus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { format } from 'date-fns';

interface Following {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  follow_id: string;
}

export default function Following() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [following, setFollowing] = useState<Following[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;
  const [profileData, setProfileData] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (username) {
      fetchFollowing();
    }
  }, [username, page]);

  const fetchFollowing = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the user's ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;
      if (!profileData) throw new Error('Profile not found');

      setProfileData(profileData);

      // Calculate pagination
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      // Get following with pagination
      const { data: followData, error: followError, count } = await supabase
        .from('follows')
        .select(`
          following:following_id (
            id,
            username,
            avatar_url,
            created_at
          ),
          id
        `, { count: 'exact' })
        .eq('follower_id', profileData.id)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (followError) throw followError;

      // Transform the data
      const transformedFollowing = followData?.map(f => ({
        id: f.following.id,
        username: f.following.username,
        avatar_url: f.following.avatar_url,
        created_at: f.following.created_at,
        follow_id: f.id
      })) || [];

      setFollowing(transformedFollowing);
      setTotalPages(Math.ceil((count || 0) / perPage));
    } catch (error) {
      console.error('Error fetching following:', error);
      setError(error instanceof Error ? error.message : 'Failed to load following');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (followId: string) => {
    if (!user) return;

    const confirmed = window.confirm('Are you sure you want to unfollow this user?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('id', followId);

      if (error) throw error;

      // Refresh the following list
      await fetchFollowing();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      alert('Failed to unfollow user');
    }
  };

  if (loading && following.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{username}'s Following - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {username} is Following
              </h1>
              <p className="text-primary-200">
                People that {username} follows
              </p>
            </div>
            <Link
              to={`/profile/${username}`}
              className="text-primary-100 hover:text-white transition-colors"
            >
              Back to Profile
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {following.length === 0 ? (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
              <User className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-lg text-primary-200">Not following anyone yet</p>
            </div>
          ) : (
            following.map((followedUser) => (
              <div
                key={followedUser.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200"
              >
                <div className="p-4 flex items-center justify-between">
                  <Link
                    to={`/profile/${followedUser.username}`}
                    className="flex items-center gap-4 flex-1"
                  >
                    {followedUser.avatar_url ? (
                      <img
                        src={followedUser.avatar_url}
                        alt={followedUser.username}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-xl font-semibold text-primary-600">
                          {followedUser.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {followedUser.username}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Following since {format(new Date(followedUser.created_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </Link>
                  {user?.id === profileData?.id && followedUser.id !== user.id && (
                    <button
                      onClick={() => handleUnfollow(followedUser.follow_id)}
                      className="p-2 text-red-600 hover:text-red-700 transition-colors"
                      title="Unfollow"
                    >
                      <UserMinus className="w-5 h-5" />
                    </button>
                  )}
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
    </>
  );
}