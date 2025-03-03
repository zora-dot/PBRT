import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { formatDistanceToNow } from 'date-fns';
import { Heart, Star, UserPlus, MessageSquare, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface Notification {
  id: string;
  type: 'like' | 'favorite' | 'follow' | 'comment' | 'follow_request';
  created_at: string;
  is_read: boolean;
  paste_id: string | null;
  comment_id: string | null;
  request_id?: string;
  actor: {
    username: string;
    avatar_url: string | null;
  };
}

export default function ActivityFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
    markAllAsRead();
  }, [user, navigate]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey (
            username,
            avatar_url
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'favorite':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'follow':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'follow_request':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const actor = notification.actor.username;
    switch (notification.type) {
      case 'like':
        return `${actor} liked your ${notification.paste_id ? 'paste' : 'comment'}`;
      case 'favorite':
        return `${actor} favorited your paste`;
      case 'follow':
        return `${actor} started following you`;
      case 'follow_request':
        return notification.request_id 
          ? `${actor} wants to follow you` 
          : `${actor} requested to follow you`;
      case 'comment':
        return `${actor} commented on your paste`;
      default:
        return '';
    }
  };

  const getNotificationLink = (notification: Notification) => {
    if (notification.paste_id) {
      return `/paste/${notification.paste_id}`;
    }
    if (notification.type === 'follow' || notification.type === 'follow_request') {
      return `/profile/${notification.actor.username}`;
    }
    return '#';
  };

  const handleFollowRequest = async (notificationId: string, requestId: string, accept: boolean) => {
    try {
      const { error } = await supabase.rpc('respond_to_follow_request', {
        p_request_id: requestId,
        p_response: accept ? 'accepted' : 'rejected'
      });

      if (error) throw error;

      // Refresh notifications
      await fetchNotifications();
    } catch (error) {
      console.error('Error handling follow request:', error);
      setError('Failed to process follow request');
    }
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
        <title>Your Activity Feed - PasteBin Rich Text</title>
        <meta name="description" content="Stay updated with your paste activity. Track likes, comments, and interactions with your content in real-time." />
        <meta property="og:title" content="Your Activity Feed - PasteBin Rich Text" />
        <meta property="og:description" content="Stay updated with your paste activity. Track likes, comments, and interactions with your content in real-time." />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/logo.png" />
      </Helmet>

      <div className="max-w-4xl mx-auto">
        <div className="bg-primary-800/50 rounded-lg backdrop-blur-sm border border-primary-700 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Activity Feed</h1>
              <p className="text-primary-200">Stay updated with your paste activity</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-xl">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <a
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  className={`block p-4 hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-primary-50' : ''
                  }`}
                  onClick={(e) => {
                    if (getNotificationLink(notification) === '#') {
                      e.preventDefault();
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.actor.avatar_url ? (
                        <img
                          src={notification.actor.avatar_url}
                          alt={notification.actor.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {notification.actor.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getNotificationIcon(notification.type)}
                        <p className="text-gray-900">
                          <span>{getNotificationText(notification)}</span>
                          {notification.type === 'follow_request' && !notification.is_read && (
                            <div className="mt-2 flex gap-2">
                              <button
                                onClick={() => handleFollowRequest(notification.id, notification.request_id!, true)}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleFollowRequest(notification.id, notification.request_id!, false)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                              >
                                Decline
                              </button>
                            </div>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}