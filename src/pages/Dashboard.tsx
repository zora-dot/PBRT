import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, Plus, Lock, Share2, Edit2, Folder, MessageSquare, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import FolderList from '../components/FolderList';
import UsageStats from '../components/UsageStats';
import SearchBar from '../components/SearchBar';
import LikeButton from '../components/LikeButton';
import FavoriteButton from '../components/FavoriteButton';
import ShareDialog from '../components/ShareDialog';
import { getDailyUsageStats } from '../utils/pasteUtils';
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
  custom_url: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  favorites_count: number;
  likes_count?: number;
  comments_count: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pastes, setPastes] = useState<Paste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(searchParams.get('folder'));
  const [selectedPasteId, setSelectedPasteId] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'public' | 'private'>('all');
  const [usageStats, setUsageStats] = useState({ dailyPastes: 0, totalStorage: 0 });
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/dashboard' } });
      return;
    }
    fetchPastes();
    fetchUsageStats();
    if (selectedFolder) {
      fetchCurrentFolder();
    }
  }, [user, selectedFolder]);

  const fetchCurrentFolder = async () => {
    if (!selectedFolder) return;

    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .eq('id', selectedFolder)
        .single();

      if (error) throw error;
      setCurrentFolder(data);
    } catch (error) {
      console.error('Error fetching current folder:', error);
      setCurrentFolder(null);
    }
  };

  const fetchUsageStats = async () => {
    if (!user) return;
    try {
      // First try to get direct count from database
      const { data: directCount, error: countError } = await supabase.rpc(
        'get_daily_paste_count',
        { user_id_param: user.id }
      );
      
      if (!countError && typeof directCount === 'number') {
        console.log('Direct count from DB:', directCount);
        
        // Get total storage
        const { data: totalPastes, error: totalError } = await supabase.rpc(
          'count_user_pastes',
          { user_id_param: user.id }
        );
        
        console.log('Total pastes count:', totalPastes);
        
        // If we have a direct count, use it
        if (directCount > 0) {
          setUsageStats({
            dailyPastes: directCount,
            totalStorage: usageStats.totalStorage // Keep existing storage value
          });
          
          // Still get full stats in background for storage calculation
          getDailyUsageStats(user.id).then(stats => {
            console.log('Full usage stats:', stats);
            setUsageStats(prev => ({
              dailyPastes: directCount, // Keep the direct count
              totalStorage: stats.totalStorage // Update storage
            }));
          }).catch(err => {
            console.error('Error getting full stats:', err);
          });
          
          return;
        }
      }
      
      // Fallback to client-side calculation
      const stats = await getDailyUsageStats(user.id);
      console.log('Usage stats from client:', stats);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const fetchPastes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('paste_details')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (selectedFolder) {
        query = query.eq('folder_id', selectedFolder);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter out expired pastes
      const now = new Date();
      const validPastes = (data || []).filter(paste => {
        return !paste.expires_at || new Date(paste.expires_at) > now;
      });
      
      setPastes(validPastes);
      setRetryCount(0);
      
      // After fetching pastes, refresh usage stats
      fetchUsageStats();
    } catch (error) {
      console.error('Error fetching pastes:', error);
      setError('Failed to load pastes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = (pasteId: string) => {
    setSelectedPasteId(pasteId);
    setIsShareDialogOpen(true);
  };

  const filteredPastes = pastes.filter(paste => {
    const matchesSearch = paste.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      paste.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' ? true :
      filterType === 'public' ? paste.is_public :
      !paste.is_public;

    return matchesSearch && matchesFilter;
  });

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
        <title>Your Dashboard - PasteBin Rich Text</title>
        <meta name="description" content="Manage your pastes, folders, and see your daily usage stats in one place. Create, edit, and organize your content efficiently." />
        <meta property="og:title" content="Your Dashboard - PasteBin Rich Text" />
        <meta property="og:description" content="Manage your pastes, folders, and see your daily usage stats in one place. Create, edit, and organize your content efficiently." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-primary-200">Manage and organize your pastes</p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/drafts"
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Drafts
              </Link>
              <Link
                to="/all-pastes"
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-md hover:bg-primary-600 transition-colors"
              >
                <FileText className="w-4 h-4" />
                View All Pastes
              </Link>
              <Link
                to="/"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Paste</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <UsageStats
            dailyPastes={usageStats.dailyPastes}
            totalStorage={usageStats.totalStorage}
          />
        </div>

        <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search pastes by title or content..."
            className="w-full sm:w-auto"
            showResults={false}
          />
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary-300" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'public' | 'private')}
              className="bg-primary-800/50 text-primary-100 border border-primary-600/50 rounded-lg px-3 py-2 focus:outline-none focus:border-primary-500"
            >
              <option value="all">All Pastes</option>
              <option value="public">Public Only</option>
              <option value="private">Private Only</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <FolderList
              selectedFolder={selectedFolder}
              onFolderSelect={(folderId) => {
                setSelectedFolder(folderId);
                if (folderId) {
                  navigate(`/dashboard?folder=${folderId}`);
                } else {
                  navigate('/dashboard');
                }
              }}
              enableResults={false}
            />
          </div>

          <div className="lg:col-span-3">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
                {error}
              </div>
            )}

            <h2 className="text-xl font-bold text-white mb-4">
              {selectedFolder ? `Folder: ${currentFolder?.name}` : 'Recent Pastes'}
              {searchQuery && (
                <span className="text-sm font-normal text-primary-300 ml-2">
                  Showing results for "{searchQuery}"
                </span>
              )}
            </h2>

            <div className="space-y-4">
              {filteredPastes.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-500">
                    {selectedFolder
                      ? 'No pastes in this folder yet'
                      : searchQuery
                        ? 'No pastes found matching your search'
                        : 'No pastes yet. Create your first paste!'}
                  </p>
                </div>
              ) : (
                filteredPastes.map((paste) => (
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
                        {paste.folder && (
                          <div className="flex items-center gap-2 text-primary-600">
                            <Folder className="w-5 h-5" />
                            <span>{paste.folder.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="text-emerald-700">Created: {format(new Date(paste.created_at), 'MMM dd, yyyy h:mm a')}</div>
                        {paste.expires_at && (
                          <div className="text-orange-700">Expires: {format(new Date(paste.expires_at), 'MMM dd, yyyy h:mm a')}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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