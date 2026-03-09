import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Moon, Sun, Bell, User, Settings, LogOut, ChevronDown, Pencil, Home } from 'lucide-react';
import { auth } from '@/api/authClient';
import { Notification, NotificationRead } from '@/api/entities';
import ProfileModal from '../modals/ProfileModal';
import SettingsModal from '../modals/SettingsModal';
import NotificationDropdown from './NotificationDropdown';
import { useTheme } from '../ThemeContext';

export default function Header({ user, onUserUpdate, projectName, onProjectNameChange, autoSaving, isLabPage }) {
  const { theme, toggleTheme, getLogo } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName || '');
  const [unreadCount, setUnreadCount] = useState(0);

  const handleUserUpdate = async (updatedUser) => {
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  const handleProfileClick = () => {
    setShowUserMenu(false);
    setShowProfileModal(true);
  };

  const handleSettingsClick = () => {
    setShowUserMenu(false);
    setShowSettingsModal(true);
  };

  const handleLogout = () => {
    auth.logout();
  };

  const handleSaveProjectName = () => {
    if (tempProjectName.trim() && onProjectNameChange) {
      onProjectNameChange(tempProjectName);
    }
    setEditingProjectName(false);
  };

  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    if (!user) return;
    try {
      const notifications = await Notification.filter({ is_active: true });
      const readNotifs = await NotificationRead.filter({ user_email: user.email || '' });
      const readIds = readNotifs.map(r => r.notification_id);
      
      const userCreatedDate = user.created_date ? new Date(user.created_date) : new Date();
      const isNewUser = (Date.now() - userCreatedDate.getTime()) < 24 * 60 * 60 * 1000;
      
      const filtered = notifications.filter(notif => {
        if (notif.target_audience === 'all') return true;
        if (notif.target_audience === 'new_signups' && isNewUser) return true;
        return false;
      });
      
      const unread = filtered.filter(n => !readIds.includes(n.id)).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  return (
    <>
      <div className="px-6 pt-6 pb-4">
        <div className="max-w-7xl mx-auto">
          <div className={`backdrop-blur-md rounded-2xl px-6 py-3 shadow-xl relative z-[200] ${
          theme === 'dark' ?
          'bg-slate-900/80 border border-slate-800' :
          'bg-white/80 border border-slate-200'}`
          }>
            <div className="grid grid-cols-3 items-center">
              {/* Left: Logo + Lab Name */}
              <div className="flex items-center gap-3">
                <a 
                  href="/Dashboard" 
                  className="flex items-center gap-3 transition-all hover:opacity-80 group"
                >
                  <img
                    src={getLogo()}
                    alt="OrphaNova Lab"
                    className="w-8 h-8 object-contain transition-transform group-hover:scale-110" />

                  <span className={`font-semibold text-lg transition-colors ${
                  theme === 'dark' ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'}`
                  }>OrphaNova Lab</span>
                </a>
              </div>

              {/* Center: Home Button + Project Name (Lab) or Feedback Button (Dashboard) */}
              <div className="flex items-center justify-center gap-3">
                {isLabPage ?
                <>
                    <a
                    href="/Dashboard"
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    theme === 'dark' ?
                    'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white' :
                    'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900'}`
                    }
                    title="Go to Dashboard">

                      <Home className="w-4 h-4" />
                    </a>
                    {editingProjectName ?
                  <input
                    type="text"
                    value={tempProjectName}
                    onChange={(e) => setTempProjectName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveProjectName()}
                    onBlur={handleSaveProjectName}
                    className={`border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ?
                    'bg-slate-800 border-blue-500/50 text-white' :
                    'bg-white border-blue-500 text-slate-900'}`
                    }
                    autoFocus /> :


                  <button
                    onClick={() => {
                      setEditingProjectName(true);
                      setTempProjectName(projectName || '');
                    }}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full transition-all text-sm group ${
                    theme === 'dark' ?
                    'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white' :
                    'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900'}`
                    }>

                        <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {projectName || 'Untitled Project'}
                        </span>
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                  }
                  </> :

                <a
                  href="mailto:hello@orphanova.com?subject=Feedback%20from%20OrphaNova%20Lab"
                  className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all text-sm ${
                  theme === 'dark' ?
                  'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white' :
                  'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900'}`
                  }>

                    <Mail className="w-4 h-4" />
                    <span>Share your feedback</span>
                  </a>
                }
              </div>

              {/* Right: Notifications + Theme Toggle + User Profile */}
              <div className="flex items-center justify-end gap-3">
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowNotifications(!showNotifications);
                      if (!showNotifications) loadUnreadCount();
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                    theme === 'dark' ?
                    'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white' :
                    'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900'}`
                    }
                    title="Notifications">

                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <NotificationDropdown 
                      user={user} 
                      theme={theme} 
                      onClose={() => {
                        setShowNotifications(false);
                        loadUnreadCount();
                      }} 
                    />
                  )}
                </div>

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${
                  theme === 'dark' ?
                  'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white' :
                  'bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900'}`
                  }
                  title={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}>

                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
                
                {/* User Profile */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)} 
                    className="rounded-full w-9 h-9 flex items-center justify-center hover:opacity-90 transition-opacity font-semibold text-white overflow-hidden"
                    style={{
                      backgroundImage: (user?.profile_picture || user?.photo_url) ? `url(${user.profile_picture || user.photo_url})` : undefined,
                      backgroundColor: (user?.profile_picture || user?.photo_url) ? undefined : '#f97316',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    {!(user?.profile_picture || user?.photo_url) && (user?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U')}
                  </button>

                  {showUserMenu &&
                  <>
                      <div
                      className="fixed inset-0 z-[250]"
                      onClick={() => setShowUserMenu(false)} />

                      <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute right-0 mt-2 w-64 rounded-lg shadow-2xl overflow-hidden z-[300] ${
                      theme === 'dark' ?
                      'bg-slate-800 border border-slate-700' :
                      'bg-white border border-slate-200'}`
                      }>

                        <div className={`p-4 border-b ${
                      theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`
                      }>
                          <p className={`font-medium truncate ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'}`
                        }>{user?.full_name || 'User'}</p>
                          <p className={`text-xs truncate ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                        }>{user?.email}</p>
                          {user?.role &&
                        <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                              {user.role}
                            </span>
                        }
                        </div>
                        <div className="p-2">
                          <button
                          onClick={handleProfileClick}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                          theme === 'dark' ?
                          'hover:bg-slate-700 text-slate-300' :
                          'hover:bg-slate-100 text-slate-700'}`
                          }>

                            <User className="w-4 h-4" />
                            <span className="text-sm">Profile</span>
                          </button>
                          <button
                          onClick={handleSettingsClick}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                          theme === 'dark' ?
                          'hover:bg-slate-700 text-slate-300' :
                          'hover:bg-slate-100 text-slate-700'}`
                          }>

                            <Settings className="w-4 h-4" />
                            <span className="text-sm">Settings</span>
                          </button>
                          <button
                          onClick={handleLogout}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-red-500/20 rounded-lg hover:text-red-400 transition-all text-left ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`
                          }>

                            <LogOut className="w-4 h-4" />
                            <span className="text-sm">Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProfileModal &&
      <ProfileModal
        user={user}
        onClose={() => setShowProfileModal(false)}
        onUpdate={onUserUpdate} />

      }
      
      {showSettingsModal &&
      <SettingsModal
        user={user}
        onClose={() => setShowSettingsModal(false)}
        onUpdate={onUserUpdate} />

      }
    </>);

}