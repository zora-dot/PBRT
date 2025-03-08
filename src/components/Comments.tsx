import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LikeButton from './LikeButton';
import { Link } from 'react-router-dom';
import Editor from './Editor';
import { supabase } from '../utils/supabaseClient';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function Comments({ pasteId, pasteUserId }: { pasteId: string, pasteUserId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            profiles (
              username,
              avatar_url
            )
          `)
          .eq('paste_id', pasteId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
        setError('Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchComments();

    const subscription = supabase
      .channel('comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `paste_id=eq.${pasteId}`,
        },
        async () => {
          await fetchComments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [pasteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          paste_id: pasteId,
          user_id: user.id,
          content: newComment.trim()
        });

      if (error) throw error;
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      setError('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string, commentUserId: string) => {
    if (!user) return;
    
    if (user.id !== commentUserId && user.id !== pasteUserId) return;

    const confirmed = window.confirm('Are you sure you want to delete this comment?');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('paste_id', pasteId);

      if (error) throw error;
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Failed to delete comment');
    }
  };

  if (!user) {
    return (
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg shadow-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <h3 className="text-2xl font-bold text-primary-900 mb-4">
            Join the Conversation
          </h3>
          <p className="text-primary-700 mb-6 text-lg">
            Sign in to share your thoughts and engage with other users
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white text-lg font-medium rounded-lg hover:bg-primary-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Sign in to Comment
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-white mb-6">Comments</h2>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <Editor
            content={newComment}
            onChange={setNewComment}
            editable={!isSubmitting}
            minHeight="150px"
            showEmoji={false}
            showToolbar={true}
            showSaveDraft={false}
          />
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              <Send className="w-5 h-5" />
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      </form>

      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-lg border border-primary-700/20">
            <p className="text-lg text-primary-200">
              No comments yet. Be the first to share your thoughts!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow-lg p-6 transition-all hover:shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {comment.profiles.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt={comment.profiles.username}
                        className="w-10 h-10 rounded-full ring-2 ring-primary-500/20"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center ring-2 ring-primary-500/20">
                        <span className="text-lg font-semibold text-white">
                          {comment.profiles.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Link to={`/profile/${comment.profiles.username}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors">
                        {comment.profiles.username}
                      </Link>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-2 prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: comment.content }} />
                    <div className="mt-3 flex items-center space-x-4">
                      <LikeButton commentId={comment.id} />
                    </div>
                  </div>
                </div>
                {(user?.id === comment.user_id || user?.id === pasteUserId) && (
                  <button
                    onClick={() => handleDelete(comment.id, comment.user_id)}
                    className="text-red-500 hover:text-red-600 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}