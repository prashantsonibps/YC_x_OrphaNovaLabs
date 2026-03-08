import React, { useState, useEffect } from 'react';
import { Notification } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function NotificationCenter() {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    link: '',
    link_text: '',
    youtube_url: '',
    target_audience: 'all',
    is_active: true
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const notifs = await Notification.list('-created_date');
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async () => {
    if (!formData.title || !formData.message) {
      alert('Title and message are required');
      return;
    }

    try {
      await Notification.create(formData);
      await loadNotifications();
      setFormData({
        title: '',
        message: '',
        link: '',
        link_text: '',
        youtube_url: '',
        target_audience: 'all',
        is_active: true
      });
      setShowForm(false);
      alert('Notification created!');
    } catch (error) {
      alert('Error creating notification: ' + error.message);
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await Notification.update(id, { is_active: !currentStatus });
      await loadNotifications();
    } catch (error) {
      alert('Error updating notification: ' + error.message);
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await Notification.delete(id);
      await loadNotifications();
    } catch (error) {
      alert('Error deleting notification: ' + error.message);
    }
  };

  if (loading) {
    return <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Loading notifications...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? 'Cancel' : 'New Notification'}
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Create Notification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Message</label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Link (optional)</label>
                <Input
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  placeholder="https://..."
                  className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Link Text</label>
                <Input
                  value={formData.link_text}
                  onChange={(e) => setFormData({ ...formData, link_text: e.target.value })}
                  placeholder="Click here"
                  className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
                />
              </div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>YouTube URL (optional)</label>
              <Input
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                placeholder="https://youtube.com/..."
                className={theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Target Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <option value="all">All Users</option>
                <option value="new_signups">New Sign-ups (last 7 days)</option>
              </select>
            </div>
            <Button onClick={createNotification} className="w-full bg-blue-600 hover:bg-blue-700">
              Create Notification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notification List */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            All Notifications ({notifications.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {notif.title}
                      </p>
                      <Badge className={notif.is_active ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}>
                        {notif.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                        {notif.target_audience === 'all' ? 'All Users' : 'New Sign-ups'}
                      </Badge>
                    </div>
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {notif.message}
                    </p>
                    {notif.link && (
                      <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                        Link: {notif.link}
                      </p>
                    )}
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                      Created: {new Date(notif.created_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(notif.id, notif.is_active)}
                      className="p-2 rounded hover:bg-slate-700 transition-colors"
                      title={notif.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {notif.is_active ? (
                        <EyeOff className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                      ) : (
                        <Eye className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-2 rounded hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}