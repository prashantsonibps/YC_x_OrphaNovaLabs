import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Notification, NotificationRead } from '@/api/entities';
import { X, ExternalLink, Youtube } from 'lucide-react';

export default function NotificationPanel({ user, theme, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const allNotifs = await Notification.filter({ is_active: true }, '-created_date');
      
      const userCreatedDate = new Date(user.created_date);
      const daysSinceSignup = (Date.now() - userCreatedDate) / (1000 * 60 * 60 * 24);
      const isNewUser = daysSinceSignup <= 7;

      const relevantNotifs = allNotifs.filter(notif => {
        if (notif.target_audience === 'all') return true;
        if (notif.target_audience === 'new_signups' && isNewUser) return true;
        return false;
      });

      const readNotifs = await NotificationRead.filter({ user_email: user.email });
      const readIds = new Set(readNotifs.map(r => r.notification_id));

      const notifsWithStatus = relevantNotifs.map(n => ({
        ...n,
        isRead: readIds.has(n.id)
      }));

      setNotifications(notifsWithStatus);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    const notif = notifications.find(n => n.id === notifId);
    if (!notif.isRead) {
      await NotificationRead.create({
        notification_id: notifId,
        user_email: user.email
      });
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, isRead: true } : n)
      );
    }
  };

  const extractYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return match ? match[1] : null;
  };

  return (
    <>
      <div className="fixed inset-0 z-[250]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className={`absolute right-0 mt-2 w-96 max-h-[600px] rounded-xl shadow-2xl overflow-hidden z-[300] ${
          theme === 'dark'
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-white border border-slate-200'
        }`}
      >
        <div className={`p-4 border-b flex items-center justify-between ${
          theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
        }`}>
          <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            Notifications
          </h3>
          <button
            onClick={onClose}
            className={theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[520px]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-4 cursor-pointer transition-all ${
                    !notif.isRead
                      ? theme === 'dark'
                        ? 'bg-blue-500/10 hover:bg-blue-500/15'
                        : 'bg-blue-50 hover:bg-blue-100'
                      : theme === 'dark'
                      ? 'hover:bg-slate-700/50'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-semibold ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></span>
                    )}
                  </div>
                  
                  <p className={`text-sm mb-2 ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}>
                    {notif.message}
                  </p>

                  {notif.link && (
                    <a
                      href={notif.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mb-2"
                    >
                      {notif.link_text || 'Click here'}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {notif.youtube_url && (() => {
                    const videoId = extractYouTubeId(notif.youtube_url);
                    return videoId ? (
                      <div className="mt-2">
                        <a
                          href={notif.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-2 p-2 rounded-lg border ${
                            theme === 'dark'
                              ? 'bg-slate-900/50 border-slate-600 hover:border-red-500'
                              : 'bg-slate-100 border-slate-300 hover:border-red-500'
                          } transition-colors`}
                        >
                          <Youtube className="w-5 h-5 text-red-500" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate ${
                              theme === 'dark' ? 'text-white' : 'text-slate-900'
                            }`}>
                              Watch Video
                            </p>
                            <p className={`text-xs truncate ${
                              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              YouTube
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-slate-400" />
                        </a>
                      </div>
                    ) : null;
                  })()}

                  <p className={`text-xs mt-2 ${
                    theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                  }`}>
                    {new Date(notif.created_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}