import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Mail, Bell, Database, Shield, Crown, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from '../ThemeContext';

export default function SettingsModal({ user, onClose, onUpdate }) {
  const { theme } = useTheme();
  const { updateUserProfile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [settings, setSettings] = useState({
    email_notifications: true,
    research_updates: true,
    stage_completion_emails: true,
    weekly_summary: false,
    auto_save_enabled: true,
    auto_save_interval: 30,
    data_sharing_analytics: false,
    data_sharing_improvements: true,
    data_sharing_research: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentUser = await refreshProfile();
      if (currentUser?.preferences) {
        setSettings(prev => ({ ...prev, ...currentUser.preferences }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const updated = await updateUserProfile({ preferences: settings });
      
      if (onUpdate && updated) {
        onUpdate(updated);
      }
      
      alert('Settings saved successfully!');
      onClose();
    } catch (error) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500]" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4"
        onClick={(e) => {
          // Close modal if clicking the backdrop (motion.div), not the card
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden ${
          theme === 'dark' ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between p-6 border-b ${
            theme === 'dark' ? 'border-slate-700' : 'border-slate-200'
          }`}>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Settings</h2>
            <button
              onClick={onClose}
              className={theme === 'dark' ? 'text-slate-400 hover:text-white transition-colors' : 'text-slate-600 hover:text-slate-900 transition-colors'}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-8">
            
            {/* Plan Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Subscription Plan</h3>
              </div>
              
              <div className={`rounded-lg p-4 border ${
                theme === 'dark' 
                  ? 'bg-slate-800 border-slate-700' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      Student Plan
                    </p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      Perfect for learning and exploration
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Free</p>
                  </div>
                </div>
                
                <div className={`mt-4 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Want more features and unlimited access?
                  </p>
                  <a
                    href="mailto:admin@orphanova.com?subject=Upgrade%20to%20Advanced%20Plan"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Upgrade to Advanced</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
            
            {user?.role === 'admin' && (
              <div className={`rounded-lg p-4 border ${
                theme === 'dark' 
                  ? 'bg-blue-900/20 border-blue-500/30' 
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>
                  Admin Controls
                </p>
                <a
                  href="/AdminNotifications"
                  className={`inline-flex items-center gap-2 text-sm ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  Manage Notifications
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            
            {/* Email Notifications */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-blue-400" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Email Notifications</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Enable Email Notifications</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Receive emails about your research</p>
                  </div>
                  <button
                    onClick={() => updateSetting('email_notifications', !settings.email_notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.email_notifications ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.email_notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Research Updates</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Get notified when stages complete</p>
                  </div>
                  <button
                    onClick={() => updateSetting('research_updates', !settings.research_updates)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.research_updates ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.research_updates ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Stage Completion Emails</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Email when each stage finishes</p>
                  </div>
                  <button
                    onClick={() => updateSetting('stage_completion_emails', !settings.stage_completion_emails)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.stage_completion_emails ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.stage_completion_emails ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Weekly Summary</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Get a weekly project summary email</p>
                  </div>
                  <button
                    onClick={() => updateSetting('weekly_summary', !settings.weekly_summary)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.weekly_summary ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.weekly_summary ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Save Preferences */}
            <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-5 h-5 text-green-400" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Auto-Save</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Enable Auto-Save</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Automatically save your work</p>
                  </div>
                  <button
                    onClick={() => updateSetting('auto_save_enabled', !settings.auto_save_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.auto_save_enabled ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.auto_save_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings.auto_save_enabled && (
                  <div>
                    <Label className={`block mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Auto-Save Interval</Label>
                    <select
                      value={settings.auto_save_interval}
                      onChange={(e) => updateSetting('auto_save_interval', parseInt(e.target.value))}
                      className={`w-full border rounded-lg px-3 py-2 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value={15}>Every 15 seconds</option>
                      <option value={30}>Every 30 seconds</option>
                      <option value={60}>Every minute</option>
                      <option value={120}>Every 2 minutes</option>
                      <option value={300}>Every 5 minutes</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Data Sharing Preferences */}
            <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-purple-400" />
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Data Sharing & Privacy</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Share Analytics Data</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Help us improve with anonymous usage data</p>
                  </div>
                  <button
                    onClick={() => updateSetting('data_sharing_analytics', !settings.data_sharing_analytics)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.data_sharing_analytics ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.data_sharing_analytics ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Product Improvements</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Share feedback to improve features</p>
                  </div>
                  <button
                    onClick={() => updateSetting('data_sharing_improvements', !settings.data_sharing_improvements)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.data_sharing_improvements ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.data_sharing_improvements ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Research Collaboration</Label>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>Allow anonymized data for research</p>
                  </div>
                  <button
                    onClick={() => updateSetting('data_sharing_research', !settings.data_sharing_research)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.data_sharing_research ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.data_sharing_research ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className={`border rounded-lg p-4 mt-4 ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-slate-100 border-slate-300'
                }`}>
                  <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    <strong className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>Privacy Note:</strong> We take your privacy seriously. 
                    All shared data is anonymized and encrypted. You can change these preferences at any time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`p-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}