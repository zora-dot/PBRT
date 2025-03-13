import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Lock, Share2, Edit2, Folder, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';
import ShareDialog from '../components/ShareDialog';
import { supabase } from '../utils/supabaseClient';

interface Paste {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  is_public: boolean;
  user_id: string;
  folder_id: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  likes_count: number;
  favorites_count: number;
  comments_count: number;
}

interface Folder {
  id: string;
  name: string;
  user_id: string;
}

export default function FolderView() {
  const { folderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<Folder | null>(null);
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (folderId) {
      fetchFolder();
      fetchPastes();
    }
  }, [user, folderId, navigate]);

  const fetchFolder = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setFolder(data);
    } catch (error: any) {
      console.error('Error fetching folder:', error);
      setError('Failed to load folder');
      navigate('/folders');
    }
  };

  const fetchPastes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('paste_details')
        .select('*')
        .eq('user_id', user?.id)
        .eq('folder_id', folderId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out expired pastes
      const now = new Date();
      const validPastes = (data || []).filter(paste => {
        return !paste.expires_at || new Date(paste.expires_at) > now;
      });

      setPastes(validPastes);
    } catch (error: any) {
      console.error('Error fetching pastes:', error);
      setError('Failed to load pastes');
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

  if (!folder) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
          Folder not found
        </div>
        <button
          onClick={() => navigate('/folders')}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to Folders
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{folder.name} - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="w-6 h-6 text-primary-100" />
              <div>
                <h1 className="text-2xl font-bold text-white">{folder.name}</h1>
                <p className="text-primary-200">
                  {pastes.length} {pastes.length === 1 ? 'paste' : 'pastes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/folders"
                className="text-primary-100 hover:text-white transition-colors"
              >
                Back to Folders
              </Link>
              <Link
                to="/"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Create New Paste
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {pastes.length === 0 ? (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
              <p className="text-lg text-primary-200">No pastes in this folder</p>
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
                      <Link
                        to={`/paste/${paste.id}/edit`}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Edit paste"
                      >
                        <Edit2 className="w-5 h-5 text-primary-500" />
                      </Link>
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
          title={pastes.find(p => p.id === selectedPasteId)?.title || 'Untitled Paste'}
        />
      )}
    </>
  );
}