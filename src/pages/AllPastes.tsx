import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { Lock, Share2, Edit2, Folder, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
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
  deleted_at: string;
}

interface TrashItem extends Paste {
  time_in_trash: string;
  original_folder_name: string;
}

export default function AllPastes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [selectedPastes, setSelectedPastes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPastes();
    fetchTrash();
  }, [user, navigate]);

  const fetchPastes = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('paste_details')
        .select('*')
        .eq('user_id', user?.id)
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
      setError('Failed to load pastes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrash = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_trash_items', { target_user_id: user?.id });

      if (error) throw error;
      setTrashItems(data || []);
    } catch (error: any) {
      console.error('Error fetching trash:', error);
    }
  };

  const handleShare = (pasteId: string) => {
    setSelectedPasteId(pasteId);
    setIsShareDialogOpen(true);
  };

  const togglePasteSelection = (pasteId: string) => {
    const newSelected = new Set(selectedPastes);
    if (newSelected.has(pasteId)) {
      newSelected.delete(pasteId);
    } else {
      newSelected.add(pasteId);
    }
    setSelectedPastes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPastes.size === pastes.length) {
      setSelectedPastes(new Set());
    } else {
      setSelectedPastes(new Set(pastes.map(paste => paste.id)));
    }
  };

  const handleDelete = async (pasteIds: string[]) => {
    if (!pasteIds.length) return;

    const confirmed = window.confirm(
      `Are you sure you want to move ${pasteIds.length} paste${pasteIds.length === 1 ? '' : 's'} to trash?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      for (const pasteId of pasteIds) {
        const { error } = await supabase.rpc('soft_delete_paste', { paste_id: pasteId });
        if (error) throw error;
      }

      await Promise.all([fetchPastes(), fetchTrash()]);
      setSelectedPastes(new Set());
    } catch (error: any) {
      console.error('Error deleting pastes:', error);
      setError('Failed to delete pastes');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (pasteIds: string[]) => {
    if (!pasteIds.length) return;

    setIsRestoring(true);
    try {
      for (const pasteId of pasteIds) {
        const { error } = await supabase.rpc('restore_paste', { paste_id: pasteId });
        if (error) throw error;
      }

      await Promise.all([fetchPastes(), fetchTrash()]);
      setSelectedPastes(new Set());
    } catch (error: any) {
      console.error('Error restoring pastes:', error);
      setError('Failed to restore pastes');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async (pasteIds: string[]) => {
    if (!pasteIds.length) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${pasteIds.length} paste${pasteIds.length === 1 ? '' : 's'}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsPermanentlyDeleting(true);
    try {
      for (const pasteId of pasteIds) {
        const { error } = await supabase.rpc('permanently_delete_paste', {
          target_paste_id: pasteId
        });

        if (error) throw error;
      }

      await fetchTrash();
      setSelectedPastes(new Set());
    } catch (error: any) {
      console.error('Error permanently deleting pastes:', error);
      setError('Failed to permanently delete pastes');
    } finally {
      setIsPermanentlyDeleting(false);
    }
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
        <title>{showTrash ? 'Trash' : 'All Pastes'} - PasteBin Rich Text</title>
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                {showTrash ? 'Trash' : 'All Pastes'}
              </h1>
              <p className="text-primary-200">
                {showTrash 
                  ? 'Items in trash will be permanently deleted after 10 days'
                  : 'View and manage all your pastes'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowTrash(!showTrash)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                {showTrash ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    View Pastes
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    View Trash
                  </>
                )}
              </button>
              {!showTrash && (
                <Link
                  to="/"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Create New Paste
                </Link>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            {error}
          </div>
        )}

        {/* Bulk Actions */}
        {(showTrash ? trashItems : pastes).length > 0 && (
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="text-primary-100 hover:text-white transition-colors"
            >
              {selectedPastes.size === (showTrash ? trashItems : pastes).length
                ? 'Deselect All'
                : 'Select All'}
            </button>
            {selectedPastes.size > 0 && (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (showTrash) {
                      handleRestore(Array.from(selectedPastes));
                    } else {
                      handleDelete(Array.from(selectedPastes));
                    }
                  }}
                  disabled={isDeleting || isRestoring}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {showTrash ? (
                    <>
                      <RefreshCw className={`w-5 h-5 ${isRestoring ? 'animate-spin' : ''}`} />
                      {isRestoring ? 'Restoring...' : 'Restore Selected'}
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      {isDeleting ? 'Moving to trash...' : 'Move Selected to Trash'}
                    </>
                  )}
                </button>
                {showTrash && (
                  <button
                    onClick={() => handlePermanentDelete(Array.from(selectedPastes))}
                    disabled={isPermanentlyDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    {isPermanentlyDeleting ? 'Deleting...' : 'Permanently Delete Selected'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {(showTrash ? trashItems : pastes).length === 0 ? (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
              <p className="text-lg text-primary-200">
                {showTrash ? 'Trash is empty' : 'No pastes found'}
              </p>
            </div>
          ) : (
            (showTrash ? trashItems : pastes).map((paste) => (
              <div
                key={paste.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedPastes.has(paste.id)}
                      onChange={() => togglePasteSelection(paste.id)}
                      className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <div className="flex-1 flex items-center justify-between">
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
                        {!showTrash && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {!showTrash && (
                    <div className="flex items-center gap-6 mb-4">
                      <LikeButton pasteId={paste.id} />
                      <FavoriteButton pasteId={paste.id} />
                      <div className="flex items-center gap-2 text-gray-500">
                      <Link
                        to={`/paste/${paste.id}#comments`}
                        className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
                      >
                        <MessageSquare className="w-5 h-5" />
                        <span>{paste.comments_count || 0}</span>
                      </Link>
                      </div>
                      {paste.folder && (
                        <Link
                          to={`/folder/${paste.folder.id}`}
                          className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
                        >
                          <Folder className="w-5 h-5" />
                          <span>{paste.folder.name}</span>
                        </Link>
                      )}
                      {!paste.folder && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Folder className="w-5 h-5" />
                          <span>Default Folder</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <div className="text-emerald-700">Created: {format(new Date(paste.created_at), 'MMM dd, yyyy HH:mm')}</div>
                    {paste.expires_at && (
                      <div className="text-orange-700">Expires: {format(new Date(paste.expires_at), 'MMM dd, yyyy HH:mm')}</div>
                    )}
                    {showTrash && (
                      <div className="text-gray-500">
                        Moved to trash {formatDistanceToNow(new Date(paste.deleted_at), { addSuffix: true })}
                      </div>
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