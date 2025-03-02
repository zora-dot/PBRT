import React, { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { likeAnimation } from '../utils/animations';
import { supabase } from '../utils/supabaseClient';

interface LikeButtonProps {
  pasteId?: string;
  commentId?: string;
  initialLikes?: number;
}

export default function LikeButton({ pasteId, commentId, initialLikes = 0 }: LikeButtonProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const checkIfLiked = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .match({
          ...(pasteId ? { paste_id: pasteId } : {}),
          ...(commentId ? { comment_id: commentId } : {}),
          user_id: user.id
        });

      if (error) throw error;
      setIsLiked(data && data.length > 0);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const fetchLikesCount = async () => {
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id', { count: 'exact' })
        .match({
          ...(pasteId ? { paste_id: pasteId } : {}),
          ...(commentId ? { comment_id: commentId } : {})
        });

      if (error) throw error;
      setLikes(count || 0);
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      void checkIfLiked();
    }
    void fetchLikesCount();
  }, [user, pasteId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }

    try {
      if (buttonRef.current) {
        likeAnimation(buttonRef.current);
      }

      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({
            ...(pasteId ? { paste_id: pasteId } : {}),
            ...(commentId ? { comment_id: commentId } : {}),
            user_id: user.id
          });

        if (error) throw error;
        setLikes(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert([{
            ...(pasteId ? { paste_id: pasteId } : {}),
            ...(commentId ? { comment_id: commentId } : {}),
            user_id: user.id
          }]);

        if (error) throw error;
        setLikes(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleLike}
        className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
        title={isLiked ? 'Unlike' : 'Like'}
      >
        <Heart
          className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
        />
        <span className="text-sm">{likes}</span>
      </button>
      {showLoginPrompt && (
        <div className="fixed transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-[9999]" style={{
          left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left + buttonRef.current.offsetWidth / 2 : '50%',
          top: buttonRef.current ? buttonRef.current.getBoundingClientRect().top - 40 : '0'
        }}>
          You must be logged in to like
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-8 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}