{/* Previous file content restored - removing the grid layout changes */}
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { Helmet } from 'react-helmet-async';
import DualModeEditor from '../components/DualModeEditor';
import { supabase } from '../utils/supabaseClient';
import { calculateExpirationDate } from '../utils/pasteUtils';
import { AlertTriangle } from 'lucide-react';
import { successAnimation } from '../utils/animations';

export default function Home() {
  const { user, isAnonymous, signInAnonymously } = useAuth();
  const { isSupporter } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expirationTime, setExpirationTime] = useState('1day');
  const [visibility, setVisibility] = useState('public');
  const [password, setPassword] = useState('');
  const [folder, setFolder] = useState<string | null>(null);
  const [contentSize, setContentSize] = useState(0);
  const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastPasteTime, setLastPasteTime] = useState<Date | null>(null);
  const [remainingCooldown, setRemainingCooldown] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchFolders();
      checkLastPasteTime();
    }
  }, [user]);

  useEffect(() => {
    // Load draft content from location state if available
    const state = location.state as { draftId?: string; draftContent?: string; draftTitle?: string };
    if (state?.draftContent) {
      setContent(state.draftContent);
      if (state.draftTitle) {
        setTitle(state.draftTitle);
      }
    }
  }, [location.state]);

  useEffect(() => {
    // Update cooldown timer
    if (lastPasteTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeSinceLastPaste = now.getTime() - lastPasteTime.getTime();
        const cooldownPeriod = isSupporter ? 1000 : 30000; // 1 second for supporters, 30 seconds for free users
        const remaining = Math.max(0, cooldownPeriod - timeSinceLastPaste);
        setRemainingCooldown(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [lastPasteTime, isSupporter]);

  const checkLastPasteTime = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('pastes')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setLastPasteTime(new Date(data[0].created_at));
      }
    } catch (error) {
      console.error('Error checking last paste time:', error);
    }
  };

  const fetchFolders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('folders')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      const uniqueFolders = data?.reduce((acc: Array<{ id: string; name: string }>, curr) => {
        if (curr.name === 'Default Folder') {
          if (!acc.some(f => f.name === 'Default Folder')) {
            acc.push(curr);
          }
        } else {
          acc.push(curr);
        }
        return acc;
      }, []) || [];
      
      setFolders(uniqueFolders);
      
      // Set default folder
      const defaultFolder = uniqueFolders.find(f => f.name === 'Default Folder');
      if (defaultFolder) {
        setFolder(defaultFolder.id);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const calculateSize = (text: string) => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return bytes.length / 1024;
  };

  const handleContentChange = (newContent: string) => {
    const size = calculateSize(newContent);
    const maxSize = isSupporter ? 250 : 50;

    if (size <= maxSize) {
      setContent(newContent);
      setContentSize(size);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.slice(0, 100);
    setTitle(newTitle);
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Please enter some content');
      return;
    }

    if (visibility === 'private' && !password) {
      setError('Password is required for private pastes when not logged in');
      return;
    }

    // Check paste size
    const contentSize = calculateSize(content);
    const maxSize = isSupporter ? 250 : 50; // 50KB for free users
    if (contentSize > maxSize) {
      setError(`Paste size exceeds the maximum allowed size of ${maxSize}KB`);
      return;
    }

    // Check rate limiting
    if (lastPasteTime) {
      const now = new Date();
      const timeSinceLastPaste = now.getTime() - lastPasteTime.getTime();
      const cooldownPeriod = isSupporter ? 1000 : 30000; // 1 second for supporters, 30 seconds for free users
      
      if (timeSinceLastPaste < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastPaste) / 1000);
        setError(`Please wait ${remainingSeconds} seconds before creating another paste`);
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    try {
      const expiresAt = calculateExpirationDate(expirationTime);
      
      // Hash password using Supabase RPC function if needed
      let hashedPassword = null;
      if (password) {
        const { data: hash, error: hashError } = await supabase.rpc('hash_paste_password', {
          password
        });
        
        if (hashError) throw hashError;
        hashedPassword = hash;
      }

      // Create paste using the new RPC function
      const { data: pasteId, error: createError } = await supabase.rpc('create_paste', {
        p_title: title || 'Untitled Paste',
        p_content: content,
        p_expires_at: expiresAt,
        p_is_public: visibility === 'public',
        p_folder_id: folder,
        p_password_hash: hashedPassword,
        p_anonymous: !user
      });

      if (createError) throw createError;
      if (!pasteId) throw new Error('Failed to create paste');

      // Update last paste time
      setLastPasteTime(new Date());

      // Clear draft after successful paste creation
      if (user) {
        await supabase
          .from('drafts')
          .delete()
          .eq('user_id', user.id)
          .eq('is_auto_saved', true);
      }

      // Show success animation
      if (formRef.current) {
        successAnimation(formRef.current);
      }

      // Navigate to the new paste
      navigate(`/paste/${pasteId}`, { 
        state: { isNewPaste: true }
      });
    } catch (error: any) {
      console.error('Error creating paste:', error);
      setError(error.message || 'Failed to create paste');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Helmet>
        <title>PasteBin Rich Text - Free Online Rich Text Editor</title>
        <meta name="description" content="Enjoy a Free Paste Bin with a Rich Text Editor and many other cool features also!" />
        <meta property="og:title" content="PasteBin Rich Text - Free Online Rich Text Editor" />
        <meta property="og:description" content="Enjoy a Free Paste Bin with a Rich Text Editor and many other cool features also!" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>
      <div className="space-y-6" ref={formRef}>
        {!user && (
          <div className="bg-primary-800/50 backdrop-blur-sm border border-primary-700 rounded-lg p-6 mb-6">
            <p className="text-primary-100 text-center mb-4">
              Sign in or sign up now to save your pastes in your dashboard
            </p>
            <div className="flex justify-center">
              <Link
                to="/login"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {remainingCooldown > 0 && (
          <div className="bg-yellow-50 border border-yellow-100 text-yellow-600 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>Please wait {remainingCooldown} seconds before creating another paste</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="p-6">
            <input
              type="text"
              id="paste-title"
              name="paste-title"
              placeholder="Paste Title (optional)"
              value={title}
              onChange={handleTitleChange}
              maxLength={100}
              className="w-full px-4 py-2 mb-4 rounded-md focus:outline-none"
              style={{
                border: '2px solid transparent',
                borderImage: 'linear-gradient(45deg, #00c6fb, #005bea) 1',
                borderImageSlice: 1
              }}
              disabled={isSubmitting}
            />
            <div className="relative">
              <DualModeEditor
                content={content}
                onChange={handleContentChange}
                editable={!isSubmitting}
                showToolbar={true}
                showSaveDraft={true}
              />
              <div className="absolute bottom-4 right-4 text-sm text-gray-500 bg-white px-2 py-1 rounded-md shadow">
                {contentSize.toFixed(1)} KB / {isSupporter ? '250' : '50'} KB
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label htmlFor="expiration-time" className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Time
            </label>
            <select
              id="expiration-time"
              name="expiration-time"
              value={expirationTime}
              onChange={(e) => setExpirationTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={isSubmitting}
            >
              <option value="1hour">1 Hour</option>
              <option value="12hours">12 Hours</option>
              <option value="1day">1 Day</option>
              <option value="5days">5 Days</option>
              <option value="10days">10 Days</option>
              <option value="30days">30 Days</option>
              <option value="never" disabled={!isSupporter}>
                Never {!isSupporter && '(Paid Feature)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setVisibility('public');
                  setPassword('');
                }}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-md border ${
                  visibility === 'public'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2 rounded-md border ${
                  visibility === 'private'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Private
              </button>
            </div>
            {visibility === 'private' && (
              <div className="mt-3">
                <label htmlFor="paste-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password {!user && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  id="paste-password"
                  name="paste-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? "Enter password to protect this paste (optional)" : "Enter password to protect this paste"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isSubmitting}
                  required={!user}
                />
              </div>
            )}
          </div>

          {user && (
            <div>
              <label htmlFor="paste-folder" className="block text-sm font-medium text-gray-700 mb-2">
                Folder
              </label>
              <select
                id="paste-folder"
                name="paste-folder"
                value={folder || ''}
                onChange={(e) => setFolder(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isSubmitting}
              >
                <option value="">Select a folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !content || remainingCooldown > 0}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : remainingCooldown > 0 ? `Wait ${remainingCooldown}s` : 'Create Paste'}
        </button>
      </div>
    </div>
  );
}