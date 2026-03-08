import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Notification, NotificationRead } from '@/api/entities';
import { X, ExternalLink, Youtube } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotificationDropdown({ user, theme, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState(new Set());

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    const allNotifs = await Notification.filter({ is_active: true }, '-created_date');
    
    const readNotifs = await NotificationRead.filter({ user_email: user.email || '' });
    const readIds = new Set(readNotifs.map(r => r.notification_id));
    
    const userCreatedDate = user.created_date ? new Date(user.created_date) : new Date();
    const isNewUser = (Date.now() - userCreatedDate.getTime()) < 24 * 60 * 60 * 1000;
    
    // Filter notifications based on target audience
    const filtered = allNotifs.filter(notif => {
      if (notif.target_audience === 'all') return true;
      if (notif.target_audience === 'new_signups' && isNewUser) return true;
      return false;
    });
    
    setNotifications(filtered);
    setReadNotifications(readIds);
  };

  const markAsRead = async (notificationId) => {
    if (readNotifications.has(notificationId)) return;
    
    await NotificationRead.create({
      notification_id: notificationId,
      user_email: user.email,
      read_at: new Date().toISOString()
    });
    
    setReadNotifications(new Set([...readNotifications, notificationId]));
  };

  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  const unreadCount = notifications.filter(n => !readNotifications.has(n.id)).length;

  return (
    <>
      <div className="fixed inset-0 z-[250]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`absolute right-0 mt-2 w-96 max-h-[600px] rounded-lg shadow-2xl overflow-hidden z-[300] ${
          theme === 'dark'
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-white border border-slate-200'
        }`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <div>
            <h3 className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <p className="text-xs text-blue-400">{unreadCount} unread</p>
            )}
          </div>
          <button onClick={onClose} className={`p-1 rounded hover:bg-slate-700 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[500px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                No notifications yet
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = readNotifications.has(notif.id);
              const videoId = getYouTubeVideoId(notif.youtube_url);
              
              return (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-4 border-b cursor-pointer transition-colors ${
                    theme === 'dark' 
                      ? `border-slate-700 ${isRead ? 'bg-slate-800' : 'bg-slate-700/50'}` 
                      : `border-slate-200 ${isRead ? 'bg-white' : 'bg-blue-50'}`
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {notif.title}
                    </h4>
                    {!isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                    )}
                  </div>
                  
                  <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    {notif.message}
                  </p>

                  {notif.link && (
                    <a
                      href={notif.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mb-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{notif.link_text || 'Click here'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {videoId && (
                    <div className="mt-2">
                      <iframe
                        width="100%"
                        height="200"
                        src={`https://www.youtube.com/embed/${videoId}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded"
                      ></iframe>
                    </div>
                  )}

                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                    {new Date(notif.created_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </>
  );
}