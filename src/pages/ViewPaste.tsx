import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Lock, Share2, Edit2, Folder, MessageSquare, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import DualModeEditor from '../components/DualModeEditor';
import Comments from '../components/Comments';
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
  custom_url: string | null;
  folder: {
    id: string;
    name: string;
  } | null;
  username?: string;
  avatar_url?: string;
  username_color?: string;
  username_bold?: boolean;
  username_italic?: boolean;
  username_underline?: boolean;
  likes_count: number;
  favorites_count: number;
  comments_count: number;
}

export default function ViewPaste() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAnonymous } = useAuth();
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPaste();
    }
  }, [id]);

  const fetchPaste = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pasteData, error: pasteError } = await supabase
        .from('paste_details')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            username_color,
            username_bold,
            username_italic,
            username_underline
          )
        `)
        .eq('id', id)
        .single();

      if (pasteError) {
        if (pasteError.code === 'PGRST116') {
          throw new Error('Paste not found');
        }
        throw pasteError;
      }

      if (!pasteData) {
        throw new Error('Paste not found');
      }

      // Map profile styling properties to paste object
      const paste = {
        ...pasteData,
        username: pasteData.profiles?.username,
        avatar_url: pasteData.profiles?.avatar_url,
        username_color: pasteData.profiles?.username_color,
        username_bold: pasteData.profiles?.username_bold,
        username_italic: pasteData.profiles?.username_italic,
        username_underline: pasteData.profiles?.username_underline
      };

      setIsPasswordProtected(!!paste.password_hash);
      setPaste(paste);
    } catch (error: any) {
      console.error('Error fetching paste:', error);
      setError(error.message || 'Failed to load paste');
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !id) return;

    setIsVerifyingPassword(true);
    setPasswordError(null);

    try {
      const { data: isValid, error } = await supabase.rpc('verify_paste_password', {
        paste_id: id,
        password: password.trim()
      });

      if (error) throw error;

      if (!isValid) {
        setPasswordError('Incorrect password');
        return;
      }

      await fetchPaste();
      setIsPasswordProtected(false);
    } catch (error: any) {
      console.error('Error verifying password:', error);
      setPasswordError('An error occurred while verifying the password. Please try again.');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-primary-100">Loading...</div>
      </div>
    );
  }

  if (error || !paste) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-4">
          {error || 'Paste not found'}
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

  if (isPasswordProtected) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            This paste is password protected
          </h2>
          <form onSubmit={verifyPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Enter password to view
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
                  passwordError
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-primary-200'
                }`}
                placeholder="Enter password"
                required
                disabled={isVerifyingPassword}
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordError}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isVerifyingPassword}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isVerifyingPassword ? 'Verifying...' : 'View Paste'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{paste?.title || 'Untitled Paste'} - PasteBin Rich Text</title>
        <meta name="description" content={`View and share code snippets and text on PasteBin Rich Text${
          paste?.title ? `: ${paste.title}` : ''
        }`} />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-4">
                {paste?.title || 'Untitled Paste'}
              </h1>
              
              <div className="flex items-center justify-between w-full mb-4">
                <div className="flex items-center gap-6">
                  <LikeButton pasteId={paste?.id} />
                  <FavoriteButton pasteId={paste?.id} />
                  <Link
                    to={`/paste/${paste?.id}#comments`}
                    className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{paste?.comments_count || 0}</span>
                  </Link>
                  {paste?.folder && (
                    <div className="flex items-center gap-2 text-primary-600">
                      <Folder className="w-5 h-5" />
                      <span>{paste.folder.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {paste && !paste.is_public && (
                    <Lock className="w-5 h-5 text-primary-500" />
                  )}
                  <button
                    onClick={() => setIsShareDialogOpen(true)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5 text-primary-500" />
                  </button>
                  {user?.id === paste?.user_id && (
                    <Link
                      to={`/paste/${paste?.id}/edit`}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      title="Edit paste"
                    >
                      <Edit2 className="w-5 h-5 text-primary-500" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary-500" />
                <span className="font-medium">PASTED BY:</span>
                {paste.user_id ? (
                  <Link 
                    to={`/profile/${paste.username}`}
                    className="hover:opacity-80 transition-colors"
                    style={{
                      color: paste.username_color || 'inherit',
                      fontWeight: paste.username_bold ? 'bold' : 'normal',
                      fontStyle: paste.username_italic ? 'italic' : 'normal',
                      textDecoration: paste.username_underline ? 'underline' : 'none'
                    }}
                  >
                    {paste.username}
                  </Link>
                ) : (
                  <span className="text-gray-500">Anonymous</span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-500 mt-2 border-t border-gray-100 pt-4 w-full">
                <div className="text-emerald-700">Created: {paste && format(new Date(paste.created_at), 'MMM dd, yyyy h:mm a')}</div>
                {paste?.expires_at && (
                  <div className="text-orange-700">Expires: {format(new Date(paste.expires_at), 'MMM dd, yyyy h:mm a')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100">
            <div className="p-4 bg-blue-200 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Paste Details:</h2>
            </div>
            <DualModeEditor
              content={paste?.content || ''}
              onChange={() => {}}
              editable={false}
              minHeight="100px"
              showToolbar={false}
              showSaveDraft={false}
            />
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <Comments pasteId={id!} pasteUserId={paste?.user_id!} />
        </div>
      </div>

      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        url={`${window.location.origin}/p/${paste.id}`}
        title={paste?.title || 'Untitled Paste'}
      />
    </>
  );
}