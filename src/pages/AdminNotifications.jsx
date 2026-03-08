import React, { useState, useEffect } from 'react';
import { auth } from '@/api/authClient';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationCenter from '../components/admin/NotificationCenter';
import { ThemeProvider, useTheme } from '../components/ThemeContext';

function AdminNotificationsContent() {
  const { theme } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await auth.isAuthenticated();
      if (!isAuth) {
        auth.redirectToLogin();
        return;
      }

      const currentUser = await auth.me();
      if (currentUser.role !== 'admin') {
        window.location.href = '/Dashboard';
        return;
      }

      setUser(currentUser);
    } catch (error) {
      console.error('Auth error:', error);
      auth.redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
    }`}>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <a href="/AdminDashboard">
            <Button variant="outline" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Dashboard
            </Button>
          </a>
          <h1 className={`text-3xl font-bold ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Notification Management
          </h1>
          <p className={`mt-2 ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Create and manage system-wide notifications for users
          </p>
        </div>

        <NotificationCenter />
      </div>
    </div>
  );
}

export default function AdminNotifications() {
  return (
    <ThemeProvider>
      <AdminNotificationsContent />
    </ThemeProvider>
  );
}