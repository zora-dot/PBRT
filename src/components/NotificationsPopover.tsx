import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, Star, UserPlus, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';
import type { Notification } from '../types';

export default function NotificationsPopover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('notifications')
      .on('system', { event: '*' }, (payload) => {
        if (payload.type === 'system_error') {
          console.error('Notifications subscription error:', payload);
          setError('Connection error. Please try again.');
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        async () => {
          await fetchNotifications();
        },
        (error) => {
          console.error('Notifications subscription error:', error);
          setError('Failed to receive updates. Please refresh.');
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase.from('notifications')
        .select(`
          *,
          actor:profiles!notifications_actor_id_fkey (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .eq('user_id', user?.id)
        .limit(5);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
      setError(null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to load notifications');
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    if (!user) return;
    
    try {
      setError(null);
      if (notificationId) {
        await handleSupabaseResponse(() => supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notificationId)
          .eq('user_id', user.id));
      } else {
        await handleSupabaseResponse(() => supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('is_read', false)
          .eq('user_id', user.id));
      }

      await fetchNotifications();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to mark notifications as read');
      console.error('Error marking notifications as read:', err);
      setError('Failed to update notifications');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'favorite':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
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
    if (notification.type === 'follow') {
      return `/profile/${notification.actor.username}`;
    }
    return '#';
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const cleanup = setupRealtimeSubscription();

      const handleClickOutside = (event: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        cleanup();
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [user]);
  const handleNotificationClick = (notification: Notification) => {
    setIsOpen(false);
    markAsRead(notification.id);
    navigate('/activity');
  };
  
  if (!user) return null;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            markAsRead();
          }
        }}
        className="relative p-2 text-primary-100 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <Link
                to="/activity"
                className="font-semibold text-gray-900 hover:text-primary-600"
                onClick={() => setIsOpen(false)}
              >
                Notifications
              </Link>
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={() => markAsRead()}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {error ? error : 'No notifications'}
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left block p-4 hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.actor.avatar_url ? (
                        <img
                          src={notification.actor.avatar_url}
                          alt={notification.actor.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {notification.actor.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        {getNotificationIcon(notification.type)}
                        <p className="text-sm text-gray-900">
                          {getNotificationText(notification)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}