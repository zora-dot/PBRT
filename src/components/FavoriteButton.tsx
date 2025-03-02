import React, { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { favoriteAnimation } from '../utils/animations';
import { supabase } from '../utils/supabaseClient';

interface FavoriteButtonProps {
  pasteId: string;
}

export default function FavoriteButton({ pasteId }: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkIfFavorited = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id')
          .eq('paste_id', pasteId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFavorited(data && data.length > 0);
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    const getFavoritesCount = async () => {
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id', { count: 'exact' })
          .eq('paste_id', pasteId);

        if (error) throw error;
        setFavoritesCount(data?.length || 0);
      } catch (error) {
        console.error('Error getting favorites count:', error);
      }
    };

    if (user && pasteId) {
      void checkIfFavorited();
    }
    void getFavoritesCount();
  }, [user, pasteId]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setShowLoginPrompt(true);
      setTimeout(() => setShowLoginPrompt(false), 3000);
      return;
    }

    try {
      if (buttonRef.current) {
        favoriteAnimation(buttonRef.current, !isFavorited);
      }

      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('paste_id', pasteId)
          .eq('user_id', user.id);

        if (error) throw error;
        setIsFavorited(false);
        setFavoritesCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert([{
            paste_id: pasteId,
            user_id: user.id
          }]);

        if (error) throw error;
        setIsFavorited(true);
        setFavoritesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleFavorite}
        className="flex items-center gap-1 text-gray-500 hover:text-yellow-500 transition-colors"
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star
          className={`w-5 h-5 ${isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`}
        />
        <span className="text-sm">{favoritesCount}</span>
      </button>
      {showLoginPrompt && (
        <div className="fixed transform -translate-x-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg whitespace-nowrap z-[9999]" style={{
          left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left + buttonRef.current.offsetWidth / 2 : '50%',
          top: buttonRef.current ? buttonRef.current.getBoundingClientRect().top - 40 : '0'
        }}>
          You must be logged in to favorite
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-8 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}