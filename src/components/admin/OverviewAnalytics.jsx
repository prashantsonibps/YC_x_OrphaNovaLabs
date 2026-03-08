import React, { useState, useEffect } from 'react';
import { User, Project } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban, CheckCircle2, TrendingUp, Activity } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function OverviewAnalytics() {
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    completedProjects: 0,
    avgCompletionTime: '0 days',
    topDiseases: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [users, projects] = await Promise.all([
        User.list(),
        Project.list()
      ]);

      // Calculate stats
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const activeUsers = users.filter(u => new Date(u.updated_date).getTime() > weekAgo).length;
      
      const completed = projects.filter(p => p.status === 'completed');
      const completionTimes = completed.map(p => {
        const created = new Date(p.created_date).getTime();
        const updated = new Date(p.updated_date).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24);
      });
      const avgDays = completionTimes.length > 0 
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

      // Top diseases
      const diseaseCounts = {};
      projects.forEach(p => {
        if (p.disease_name) {
          diseaseCounts[p.disease_name] = (diseaseCounts[p.disease_name] || 0) + 1;
        }
      });
      const topDiseases = Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        totalUsers: users.length,
        activeUsers,
        totalProjects: projects.length,
        completedProjects: completed.length,
        avgCompletionTime: `${avgDays} days`,
        topDiseases
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Users</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.totalUsers}</p>
              </div>
              <Users className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Active (7d)</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.activeUsers}</p>
              </div>
              <Activity className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Projects</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.totalProjects}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Completed</p>
                <p className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.completedProjects}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Diseases */}
        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Most Researched Diseases</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topDiseases.length > 0 ? (
              <div className="space-y-3">
                {stats.topDiseases.map((disease, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>{disease.name}</span>
                    <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{disease.count} projects</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Avg Completion Time */}
        <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
          <CardHeader>
            <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Avg. Project Completion</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stats.avgCompletionTime}</p>
              </div>
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Completion Rate</p>
                <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}