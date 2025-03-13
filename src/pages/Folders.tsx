import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Folder, FolderPlus, Edit2, Trash2, RefreshCw, Check, X, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface FolderType {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  paste_count?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default function Folders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFolders();
  }, [user, navigate]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchFolders = async (retry = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // Get current timestamp for comparing expiration
      const now = new Date().toISOString();

      // First get folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (foldersError) throw foldersError;

      // Then get paste counts for each folder, excluding expired and deleted pastes
      const foldersWithCounts = await Promise.all(
        foldersData.map(async (folder) => {
          const { count, error: countError } = await supabase
            .from('pastes')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id)
            .eq('user_id', user.id)
            .is('deleted_at', null)
            .or(`expires_at.is.null,expires_at.gt.${now}`); // Only count non-expired pastes

          if (countError) throw countError;

          return {
            ...folder,
            paste_count: count || 0
          };
        })
      );

      // Remove any duplicate "Default Folder" folders
      const uniqueFolders = foldersWithCounts.reduce((acc: FolderType[], curr) => {
        if (curr.name === 'Default Folder') {
          if (!acc.some(f => f.name === 'Default Folder')) {
            acc.push(curr);
          }
        } else {
          acc.push(curr);
        }
        return acc;
      }, []);
      
      // Sort folders to ensure "Default Folder" is first
      const sortedFolders = uniqueFolders.sort((a, b) => {
        if (a.name === 'Default Folder') return -1;
        if (b.name === 'Default Folder') return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFolders(sortedFolders);
      setRetryCount(0);
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      if (retry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        await delay(RETRY_DELAY * Math.pow(2, retryCount));
        return fetchFolders(true);
      }
      setError('Failed to load folders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        // First check if a folder with this name already exists
        const { data: existingFolder, error: checkError } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', newFolderName.trim())
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingFolder) {
          setError('A folder with this name already exists');
          return;
        }

        // Don't allow creating "Default Folder" folder
        if (newFolderName.trim().toLowerCase() === 'default folder') {
          setError('Cannot create folder with name "Default Folder"');
          return;
        }

        const { error } = await supabase
          .from('folders')
          .insert([
            {
              name: newFolderName.trim(),
              user_id: user.id
            }
          ]);

        if (error) throw error;

        setNewFolderName('');
        setIsCreating(false);
        fetchFolders();
        break;
      } catch (error: any) {
        console.error('Error creating folder:', error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          setError('Failed to create folder. Please try again.');
        } else {
          await delay(RETRY_DELAY * Math.pow(2, retries - 1));
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!user || !editName.trim() || isSubmitting) return;

    // Don't allow renaming to "Default Folder"
    if (editName.trim().toLowerCase() === 'default folder') {
      setError('Cannot rename folder to "Default Folder"');
      return;
    }

    setIsSubmitting(true);
    setError('');
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        // Check if another folder has the same name
        const { data: existingFolder, error: checkError } = await supabase
          .from('folders')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', editName.trim())
          .neq('id', folderId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingFolder) {
          setError('A folder with this name already exists');
          return;
        }

        const { error } = await supabase
          .from('folders')
          .update({ name: editName.trim() })
          .eq('id', folderId)
          .eq('user_id', user.id);

        if (error) throw error;

        setFolders(prev => 
          prev.map(folder => 
            folder.id === folderId 
              ? { ...folder, name: editName.trim() }
              : folder
          )
        );
        setEditingFolder(null);
        setEditName('');
        break;
      } catch (error: any) {
        console.error('Error updating folder:', error);
        retries++;
        
        if (retries === MAX_RETRIES) {
          setError('Failed to update folder. Please try again.');
        } else {
          await delay(RETRY_DELAY * Math.pow(2, retries - 1));
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (folderId: string, folderName: string) => {
    if (!user || isSubmitting) return;

    // Prevent deletion of "Default Folder" folder
    if (folderName.toLowerCase() === 'default folder') {
      setError('Cannot delete the "Default Folder" folder');
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this folder? All pastes in this folder will be moved to "Default Folder".'
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Get the first "Default Folder" folder
      const { data: defaultFolders, error: folderError } = await supabase
        .from('folders')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', 'Default Folder')
        .limit(1);

      if (folderError) throw folderError;
      if (!defaultFolders || defaultFolders.length === 0) {
        throw new Error('Default folder not found');
      }

      const defaultFolder = defaultFolders[0];

      // Move pastes to "Default Folder" folder
      const { error: updateError } = await supabase
        .from('pastes')
        .update({ folder_id: defaultFolder.id })
        .eq('folder_id', folderId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Delete the folder
      const { error: deleteError } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Update local state
      setFolders(prev => prev.filter(folder => folder.id !== folderId));
      setError('');
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      setError(error.message || 'Failed to delete folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    fetchFolders(true);
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
        <title>Organize Your Pastes - PasteBin Rich Text</title>
        <meta name="description" content="Keep your pastes organized with custom folders. Create, manage, and sort your content efficiently with our intuitive folder system." />
        <meta property="og:title" content="Organize Your Pastes - PasteBin Rich Text" />
        <meta property="og:description" content="Keep your pastes organized with custom folders. Create, manage, and sort your content efficiently with our intuitive folder system." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Folders</h1>
              <p className="text-primary-200">Organize your pastes into folders</p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              disabled={isSubmitting}
            >
              <FolderPlus className="w-5 h-5" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-md">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={handleRetry}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          {isCreating && (
            <form onSubmit={handleCreateFolder} className="p-4 border-b">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFolderName('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="divide-y">
            {folders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No folders yet. Create one to organize your pastes!
              </div>
            ) : (
              folders.map((folder) => (
                <div key={folder.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  {editingFolder === folder.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={() => handleUpdateFolder(folder.id)}
                        className="p-2 text-green-600 hover:text-green-700 disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingFolder(null);
                          setEditName('');
                          setError('');
                        }}
                        className="p-2 text-red-600 hover:text-red-700"
                        disabled={isSubmitting}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <Link
                          to={`/folder/${folder.id}`}
                          className="flex items-center gap-2 text-gray-900 hover:text-primary-600"
                        >
                          <Folder className="w-5 h-5 text-primary-500" />
                          <span>{folder.name}</span>
                        </Link>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          <FileText className="w-4 h-4" />
                          <span>{folder.paste_count} {folder.paste_count === 1 ? 'paste' : 'pastes'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {folder.name.toLowerCase() !== 'default folder' && (
                          <>
                            <button
                              onClick={() => {
                                setEditingFolder(folder.id);
                                setEditName(folder.name);
                                setError('');
                              }}
                              className="p-2 text-gray-600 hover:text-gray-800"
                              title="Edit folder"
                              disabled={isSubmitting}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(folder.id, folder.name)}
                              className="p-2 text-red-600 hover:text-red-700"
                              title="Delete folder"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}