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
  likes_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface SortOption {
  label: string;
  value: string;
  field: string;
  ascending: boolean;
}

const sortOptions: SortOption[] = [
  { label: 'Newest First', value: 'newest', field: 'created_at', ascending: false },
  { label: 'Oldest First', value: 'oldest', field: 'created_at', ascending: true },
  { label: 'Most Likes', value: 'likes', field: 'likes_count', ascending: false }
];

const pageSizeOptions = [10, 25, 50, 100];

export default function Comments({ pasteId, pasteUserId }: { pasteId: string, pasteUserId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalComments, setTotalComments] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>(sortOptions[0]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      
      // Get total count
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('paste_id', pasteId);
      
      setTotalComments(count || 0);
      
      // Calculate pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          likes:likes(count),
          profiles (
            username,
            avatar_url
          )
        `)
        .eq('paste_id', pasteId)
        .order(sortBy.field, { ascending: sortBy.ascending })
        .range(from, to);

      if (error) throw error;
      
      // Transform data to include likes count
      const commentsWithLikes = data?.map(comment => ({
        ...comment,
        likes_count: comment.likes.length
      })) || [];
      
      setComments(commentsWithLikes);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setError('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchComments();
  }, [currentPage, pageSize, sortBy]);

  useEffect(() => {
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
  
  const totalPages = Math.ceil(totalComments / pageSize);
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };
  
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setCurrentPage(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to comment');
      return;
    }
    
    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          paste_id: pasteId,
          user_id: user.id,
          content: newComment.trim()
        })
        .select();

      if (error) throw error;
      if (!data) throw new Error('Failed to create comment');

      setNewComment('');
      setCurrentPage(1);
      await fetchComments();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to post comment');
      console.error('Error posting comment:', err);
      setError(err.message);
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/5 backdrop-blur-sm rounded-lg p-4">
        <div className="flex items-center gap-4">
          <select
            value={sortBy.value}
            onChange={(e) => handleSortChange(sortOptions.find(opt => opt.value === e.target.value) || sortOptions[0])}
            className="bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="bg-white border border-gray-300 text-gray-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {pageSizeOptions.map(size => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
        
        <div className="text-primary-200">
          {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
        </div>
      </div>

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
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-primary-100 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-primary-100">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-primary-100 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}