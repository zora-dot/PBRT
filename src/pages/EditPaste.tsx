import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Unlock, Share2, Edit2, Folder } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DualModeEditor from '../components/DualModeEditor';
import ShareNotification from '../components/ShareNotification';
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
  password_hash: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
}

export default function EditPaste() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchPaste();
    fetchFolders();
  }, [id, user]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const fetchPaste = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('pastes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Paste not found');

      setPaste(data);
      setTitle(data.title || '');
      setContent(data.content || '');
      setIsPublic(data.is_public);
      setSelectedFolder(data.folder_id);
      setHasExistingPassword(!!data.password_hash);
      setPassword(data.password_hash ? 'unchanged' : '');
    } catch (err) {
      console.error('Error fetching paste:', err);
      setError(err.message || 'Failed to load paste');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) {
      setError('Please enter some content');
      return;
    }

    if (!isPublic && !user && !password) {
      setError('Password is required for private pastes when not logged in');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const updates: any = {
        title,
        content,
        is_public: isPublic,
        folder_id: selectedFolder
      };

      // Handle password updates
      if (!isPublic) {
        if (password === '') {
          // Clear password protection
          updates.password_hash = null;
        } else if (password !== 'unchanged') {
          // Set new password
          const { data: hashedPassword } = await supabase.rpc('hash_paste_password', {
            password
          });
          updates.password_hash = hashedPassword;
        }
      } else {
        // Public paste - remove any password protection
        updates.password_hash = null;
      }

      const { error } = await supabase
        .from('pastes')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      navigate(`/paste/${id}`);
    } catch (err) {
      console.error('Error updating paste:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowShareTooltip(true);
      setTimeout(() => setShowShareTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-4 bg-primary-50 border-b border-primary-100">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Paste Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 mb-4 rounded-md focus:outline-none"
                style={{
                  border: '2px solid transparent',
                  borderImage: 'linear-gradient(45deg, #00c6fb, #005bea) 1',
                  borderImageSlice: 1
                }}
                disabled={isSubmitting}
              />
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Folder
                  </label>
                  <select
                    value={selectedFolder || ''}
                    onChange={(e) => setSelectedFolder(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPublic(true);
                        setPassword('');
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md ${
                        isPublic
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Unlock className="w-4 h-4" />
                      Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md ${
                        !isPublic
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      Private
                    </button>
                  </div>
                </div>
              </div>

              {!isPublic && (
                <div>
                  <label htmlFor="paste-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password {!user && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="password"
                    id="paste-password"
                    value={password === 'unchanged' ? '' : password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={hasExistingPassword 
                      ? "Enter new password to change, or leave empty to remove password" 
                      : "Enter password to protect this paste"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isSubmitting}
                  />
                  {hasExistingPassword && (
                    <p className="mt-1 text-sm text-gray-500">
                      {password === 'unchanged' 
                        ? 'Password protection is active. Enter a new password to change it, or leave empty to remove protection.'
                        : password 
                          ? 'Password will be updated'
                          : 'Password protection will be removed'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            <DualModeEditor
              content={content}
              onChange={(html) => setContent(html)}
              editable={true}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(`/paste/${id}`)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <ShareNotification show={showShareTooltip} />
    </div>
  );
}