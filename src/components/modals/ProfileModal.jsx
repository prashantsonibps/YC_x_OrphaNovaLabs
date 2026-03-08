import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Lock, Trash2, Calendar, Save, Upload } from 'lucide-react';
import { auth } from '@/api/authClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '../ThemeContext';
import { Core } from '@/api/integrationsClient';

export default function ProfileModal({ user, onClose, onUpdate }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile form (name and email editable for guest so user can fill manually)
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [uploading, setUploading] = useState(false);
  const isGuest = user?.uid === 'guest';

  useEffect(() => {
    setFullName(user?.full_name || '');
    setEmail(user?.email || '');
    setBio(user?.bio || '');
  }, [user?.uid, user?.full_name, user?.email, user?.bio]);
  
  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const payload = { full_name: fullName, bio };
      if (isGuest) payload.email = email;
      await auth.updateMe(payload);
      
      if (onUpdate) {
        const updatedUser = await auth.me();
        onUpdate(updatedUser);
      }
      
      alert('Profile updated successfully!');
      onClose();
    } catch (error) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await Core.UploadFile({ file });
      await auth.updateMe({ profile_picture: file_url });
      
      if (onUpdate) {
        const updatedUser = await auth.me();
        onUpdate(updatedUser);
      }
      
      alert('Profile picture updated!');
    } catch (error) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      // Note: You'll need to implement password change in your backend
      alert('Password change functionality - implement backend endpoint');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      alert('Error changing password: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );
    
    if (!confirmed) return;
    
    const doubleConfirm = window.confirm(
      'This is your last warning. Type DELETE in the next prompt to confirm.'
    );
    
    if (!doubleConfirm) return;
    
    const finalConfirm = prompt('Type DELETE to confirm account deletion:');
    
    if (finalConfirm === 'DELETE') {
      setLoading(true);
      try {
        // Note: Implement account deletion in backend
        alert('Account deletion functionality - implement backend endpoint');
        // After deletion, logout
        // auth.logout();
      } catch (error) {
        alert('Error deleting account: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
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
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Profile Settings</h2>
            <button
              onClick={onClose}
              className={theme === 'dark' ? 'text-slate-400 hover:text-white transition-colors' : 'text-slate-600 hover:text-slate-900 transition-colors'}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className={`flex border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'profile'
                  ? theme === 'dark' ? 'text-white border-b-2 border-blue-500' : 'text-slate-900 border-b-2 border-blue-500'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'security'
                  ? theme === 'dark' ? 'text-white border-b-2 border-blue-500' : 'text-slate-900 border-b-2 border-blue-500'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'activity'
                  ? theme === 'dark' ? 'text-white border-b-2 border-blue-500' : 'text-slate-900 border-b-2 border-blue-500'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Activity
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-semibold overflow-hidden"
                      style={{
                        backgroundImage: user?.profile_picture ? `url(${user.profile_picture})` : undefined,
                        backgroundColor: user?.profile_picture ? undefined : '#f97316',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      {!user?.profile_picture && ((user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase())}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                      <Upload className="w-4 h-4 text-white" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                  <div>
                    <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user?.full_name || 'User'}</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{user?.email}</p>
                    {uploading && <p className="text-xs text-blue-400 mt-1">Uploading...</p>}
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Full Name
                  </label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Email
                  </label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!isGuest}
                    className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                    placeholder={isGuest ? 'Enter your email' : undefined}
                  />
                  {!isGuest && <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>Email cannot be changed</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Bio
                  </label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className={`min-h-[100px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Role
                  </label>
                  <Input
                    value={user?.role || 'user'}
                    disabled
                    className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                    Member Since
                  </label>
                  <Input
                    value={new Date(user?.created_date).toLocaleDateString()}
                    disabled
                    className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-500'}
                  />
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Change Password</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Current Password
                      </label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                        placeholder="Enter current password"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        New Password
                      </label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        Confirm New Password
                      </label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                        placeholder="Confirm new password"
                      />
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      {loading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </div>

                <div className={`pt-6 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`}>
                  <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Danger Zone</h3>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    variant="outline"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Recent Activity</h3>
                
                <div className="space-y-3">
                  <div className={`flex items-start gap-3 p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Account Created</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {new Date(user?.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-start gap-3 p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <User className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Profile Updated</p>
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {new Date(user?.updated_date).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className={`text-sm italic mt-4 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                    More activity tracking coming soon...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}