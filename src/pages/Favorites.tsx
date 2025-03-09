import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { Lock, Star, Folder, MessageSquare, Share2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import ShareDialog from '../components/ShareDialog';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
  likes_count: number;
  favorites_count: number;
  comments_count: number;
  username?: string;
}

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('paste_id')
        .eq('user_id', user?.id);

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        return;
      }

      const pasteIds = favoritesData.map(f => f.paste_id);
      const { data: pastesData, error: pastesError } = await supabase
        .from('paste_details')
        .select('*')
        .in('id', pasteIds)
        .order('created_at', { ascending: false });

      if (pastesError) throw pastesError;

      // Fetch usernames for each paste
      const pastesWithUsernames = await Promise.all(
        (pastesData || []).map(async (paste) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', paste.user_id)
            .single();

          return {
            ...paste,
            username: profileData?.username
          };
        })
      );

      // Filter out expired pastes
      const validPastes = pastesWithUsernames.filter(paste => 
        !paste.expires_at || new Date(paste.expires_at) > new Date()
      );

      setFavorites(validPastes);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (pasteId: string) => {
    setSelectedPasteId(pasteId);
    setIsShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Your Favorite Pastes - PasteBin Rich Text</title>
        <meta name="description" content="Access your favorite pastes quickly. Save and organize the content that matters most to you for easy reference." />
        <meta property="og:title" content="Your Favorite Pastes - PasteBin Rich Text" />
        <meta property="og:description" content="Access your favorite pastes quickly. Save and organize the content that matters most to you for easy reference." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Favorite Pastes</h1>
              <p className="text-primary-200">Your collection of saved pastes</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {favorites.length === 0 ? (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
              <Star className="w-12 h-12 text-primary-300 mx-auto mb-4" />
              <p className="text-lg text-primary-200">You haven't favorited any pastes yet</p>
            </div>
          ) : (
            favorites.map((paste) => (
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
                      {!paste.is_public && (
                        <Lock className="w-5 h-5 text-primary-500" />
                      )}
                      <button
                        onClick={() => handleShare(paste.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Share"
                      >
                        <Share2 className="w-5 h-5 text-primary-500" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                    <User className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">PASTED BY:</span>
                    {paste.username ? (
                      <Link 
                        to={`/profile/${paste.username}`}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        {paste.username}
                      </Link>
                    ) : (
                      <span>Anonymous</span>
                    )}
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
                    {paste.folder && (
                      <div className="flex items-center gap-2 text-primary-600">
                        <Folder className="w-5 h-5" />
                        <span>{paste.folder.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div>Created: {format(new Date(paste.created_at), 'MMM dd, yyyy HH:mm')}</div>
                    {paste.expires_at && (
                      <div>Expires: {format(new Date(paste.expires_at), 'MMM dd, yyyy HH:mm')}</div>
                    )}
                  </div>
                </div>
              </div>
            ))
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
          title={favorites.find(p => p.id === selectedPasteId)?.title || 'Untitled Paste'}
        />
      )}
    </>
  );
}