import React, { useState, useEffect } from 'react';
import { Folder, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { supabase, handleSupabaseResponse } from '../utils/supabaseClient';

interface FolderType {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

interface FolderListProps {
  selectedFolder: string | null;
  onFolderSelect: (folderId: string | null) => void;
}

export default function FolderList({ selectedFolder, onFolderSelect }: FolderListProps) {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void fetchFolders();
    }
  }, [user]);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      setError(''); 

      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('user_id', user?.id)
        .order('name', { ascending: true });

      if (error) throw error;

      // Remove any duplicate "All Pastes" folders
      const uniqueFolders = (data || []).reduce((acc: FolderType[], curr) => {
        if (curr.name === 'All Pastes') {
          if (!acc.some(f => f.name === 'All Pastes')) {
            acc.push(curr);
          }
        } else {
          acc.push(curr);
        }
        return acc;
      }, []) || [];

      // Sort folders to ensure "All Pastes" is first
      const sortedFolders = uniqueFolders.sort((a, b) => {
        if (a.name === 'All Pastes') return -1;
        if (b.name === 'All Pastes') return 1;
        return a.name.localeCompare(b.name);
      });

      setFolders(sortedFolders);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load folders');
      console.error('Error fetching folders:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    if (!user) return;

    try {
      setError('');
      const { data, error } = await supabase.rpc('create_folder', {
        p_name: newFolderName.trim(),
        p_user_id: user.id
      });
      
      if (error) throw error;

      setNewFolderName('');
      setIsCreating(false);
      await fetchFolders();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 font-medium"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span>Folders</span>
        </button>
        <div className="flex items-center gap-3">
          <Link
            to="/folders"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
          <button
            onClick={() => setIsCreating(true)}
            className="text-primary-600 hover:text-primary-700"
            title="Create new folder"
          >
            <FolderPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
          <button
            onClick={fetchFolders}
            className="ml-2 text-red-700 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2">
          {folders.map((folder) => (
            <Link
              key={folder.id}
              to={`/folder/${folder.id}`}
              onClick={() => onFolderSelect(folder.id)}
              className={`w-full flex items-center px-3 py-2 rounded-md ${
                selectedFolder === folder.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Folder className="w-4 h-4 mr-2" />
              <span>{folder.name}</span>
            </Link>
          ))}

          {isCreating && (
            <form onSubmit={handleCreateFolder} className="mt-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="New folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewFolderName('');
                    setError('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Create
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}