import React, { useState, useEffect, useCallback } from 'react';
import { Core } from '@/api/integrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderKanban, CheckCircle2, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function OverviewAnalytics() {
  const { theme } = useTheme();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalProjects: 0,
    completedProjects: 0,
    avgCompletionTime: '0 days',
    topDiseases: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { users, projects } = await Core.GetAdminProjects();
      const userList = Array.isArray(users) ? users : [];
      const projectList = Array.isArray(projects) ? projects : [];

      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const activeUsers = userList.filter((u) => {
        const t = u?.updated_date ? new Date(u.updated_date).getTime() : 0;
        return t > weekAgo;
      }).length;

      const completed = projectList.filter((p) => p.status === 'completed');
      const completionTimes = completed
        .map((p) => {
          const created = p.created_date ? new Date(p.created_date).getTime() : 0;
          const updated = p.updated_date ? new Date(p.updated_date).getTime() : 0;
          return (updated - created) / (1000 * 60 * 60 * 24);
        })
        .filter((d) => Number.isFinite(d) && d >= 0);
      const avgDays =
        completionTimes.length > 0
          ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
          : 0;

      const diseaseCounts = {};
      projectList.forEach((p) => {
        if (p.disease_name) {
          diseaseCounts[p.disease_name] = (diseaseCounts[p.disease_name] || 0) + 1;
        }
      });
      const topDiseases = Object.entries(diseaseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setStats({
        totalUsers: userList.length,
        activeUsers,
        totalProjects: projectList.length,
        completedProjects: completed.length,
        avgCompletionTime: `${avgDays} days`,
        topDiseases,
      });
    } catch (err) {
      console.error('OverviewAnalytics load error:', err);
      setError(err?.message || 'Failed to load analytics. Try again.');
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        totalProjects: 0,
        completedProjects: 0,
        avgCompletionTime: '0 days',
        topDiseases: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && stats.totalUsers === 0 && stats.totalProjects === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Card className={theme === 'dark' ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}>
          <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAnalytics} className="border-red-500/50 text-red-600 hover:bg-red-500/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

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