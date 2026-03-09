import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Users, Activity, FolderKanban, Bell, Database, Shield, 
  Settings, TrendingUp, AlertCircle, FileText, Flag, MessageSquare,
  BarChart3, Mail
} from 'lucide-react';
import Header from '../components/shared/Header';
// import Footer from '../components/shared/Footer'; // Kept for possible re-use later
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Import admin components
import OverviewAnalytics from '../components/admin/OverviewAnalytics';
import UserManagement from '../components/admin/UserManagement';
import ProjectViewer from '../components/admin/ProjectViewer';
import WaitlistManagement from '../components/admin/WaitlistManagement';
import NotificationCenter from '../components/admin/NotificationCenter';
import SystemHealth from '../components/admin/SystemHealth';
import AuditLogs from '../components/admin/AuditLogs';
import DraftControls from '../components/admin/DraftControls';
import FeatureFlags from '../components/admin/FeatureFlags';
import FeedbackManagement from '../components/admin/FeedbackManagement';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'waitlist', label: 'Waitlist', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'audit', label: 'Audit Logs', icon: FileText },
  { id: 'drafts', label: 'Draft Controls', icon: FileText },
  { id: 'features', label: 'Feature Flags', icon: Flag },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare }
];

function AdminDashboardContent() {
  const { theme } = useTheme();
  const { userProfile, loading: authLoading } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userProfile) {
      setUser(userProfile);
      setLoading(false);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [userProfile, authLoading]);

  if (loading || !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewAnalytics />;
      case 'users':
        return <UserManagement />;
      case 'projects':
        return <ProjectViewer />;
      case 'waitlist':
        return <WaitlistManagement />;
      case 'notifications':
        return <NotificationCenter />;
      case 'health':
        return <SystemHealth />;
      case 'audit':
        return <AuditLogs />;
      case 'drafts':
        return <DraftControls />;
      case 'features':
        return <FeatureFlags />;
      case 'feedback':
        return <FeedbackManagement />;
      default:
        return <OverviewAnalytics />;
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <Header user={user} onUserUpdate={setUser} isLabPage={false} />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              Admin Dashboard
            </h1>
            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
              Admin Access
            </Badge>
          </div>
          <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            Manage users, projects, and system settings
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex gap-2 mb-6 overflow-x-auto pb-2 ${
          theme === 'dark' ? 'border-b border-slate-800' : 'border-b border-slate-200'
        }`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? theme === 'dark'
                      ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                      : 'bg-white text-slate-900 border-b-2 border-blue-500'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>

      {/* <Footer /> - removed for now, can re-add via shared/Footer */}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ThemeProvider>
      <AdminDashboardContent />
    </ThemeProvider>
  );
}