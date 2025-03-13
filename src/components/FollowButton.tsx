import React, { useState, useEffect } from 'react';
import { UserPlus, UserMinus, UserCheck, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';

type FollowButtonProps = {
  userId: string;
  isPublic?: boolean;
};

export default function FollowButton({ userId, isPublic = true }: FollowButtonProps) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkFollowStatus = async (retry = false) => {
    if (!user) return;

    try {
      const [{ data: followData, error: followError }, { data: requestData, error: requestError }] = await Promise.all([
        // Check if already following
        supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId),
        
        // Check for pending follow request
        supabase
          .from('follow_requests')
          .select('id, status')
          .eq('requester_id', user.id)
          .eq('target_id', userId)
          .eq('status', 'pending')
      ]);

      if (followError) throw followError;
      if (requestError && requestError.code !== 'PGRST116') throw requestError;

      setIsFollowing(followData && followData.length > 0);
      setHasPendingRequest(requestData && requestData.length > 0);
      setRequestId(requestData?.[0]?.id || null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error checking follow status:', error);
      
      if (retry && retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        await delay(RETRY_DELAY * Math.pow(2, retryCount));
        return checkFollowStatus(true);
      }
      
      setError('Failed to check follow status');
    }
  };

  useEffect(() => {
    if (user) {
      void checkFollowStatus(true);
    }
  }, [user, userId]);

  const handleFollow = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (hasPendingRequest && requestId) {
        // Cancel follow request
        const { error } = await supabase.rpc('cancel_follow_request', {
          target_id: userId
        });

        if (error) throw error;
        setHasPendingRequest(false);
        setRequestId(null);
      } else if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        setHasPendingRequest(false);
      } else {
        if (isPublic) {
          // For public profiles, create follow directly
          const { error } = await supabase
            .from('follows')
            .insert([{
              follower_id: user.id,
              following_id: userId
            }]);

          if (error) throw error;
          setIsFollowing(true);
        } else {
          // For private profiles, create follow request
          const { error } = await supabase
            .from('follow_requests')
            .insert([{
              requester_id: user.id,
              target_id: userId,
              status: 'pending'
            }]);

          if (error) throw error;
          setHasPendingRequest(true);
        }
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      setError(error instanceof Error ? error.message : 'Failed to process follow action');
    } finally {
      setIsLoading(false);
      await checkFollowStatus(true); // Refresh status after loading is complete with retry
    }
  };

  // Don't show follow button if viewing own profile
  if (!user || user.id === userId) return null;

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Clock className="w-4 h-4 animate-spin" />
          <span>Processing...</span>
        </>
      );
    }

    if (isFollowing) {
      return (
        <>
          <UserMinus className="w-4 h-4" />
          <span>Unfollow</span>
        </>
      );
    }

    if (hasPendingRequest) {
      return (
        <>
          <UserMinus className="w-4 h-4" />
          <span>Cancel Request</span>
        </>
      );
    }

    return (
      <>
        <UserPlus className="w-4 h-4" />
        <span>{isPublic ? 'Follow' : 'Request to Follow'}</span>
      </>
    );
  };

  return (
    <div className="relative">
      <button
        onClick={handleFollow}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
          isFollowing || hasPendingRequest
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {getButtonContent()}
      </button>
      {error && (
        <div className="absolute top-full left-0 mt-2 w-full p-2 bg-red-50 border border-red-100 text-red-600 text-sm rounded">
          {error}
          <button
            onClick={() => checkFollowStatus(true)}
            className="ml-2 text-red-700 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}