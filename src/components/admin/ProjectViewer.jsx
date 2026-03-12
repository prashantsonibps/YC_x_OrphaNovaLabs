import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '@/api/entities';
import { Core } from '@/api/integrations';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Archive, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { createPageUrl } from '../../utils';

const RESET_PAYLOAD = {
  current_stage: 0,
  stage_status: {
    0: 'active',
    1: 'locked',
    2: 'locked',
    3: 'locked',
    4: 'locked',
    5: 'locked',
    6: 'locked',
  },
};

export default function ProjectViewer() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const currentUid = user?.uid || null;
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadProjects = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { projects: allProjects } = await Core.GetAdminProjects();
      setProjects(Array.isArray(allProjects) ? allProjects : []);
      setFilteredProjects(Array.isArray(allProjects) ? allProjects : []);
    } catch (err) {
      console.error('ProjectViewer load error:', err);
      setError(err?.message || 'Failed to load projects. Try again.');
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    let filtered = [...projects];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.disease_name?.toLowerCase().includes(term) ||
          p.created_by?.toLowerCase().includes(term) ||
          p.owner_email?.toLowerCase().includes(term) ||
          p.owner_name?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  const archiveProject = async (project) => {
    if (!confirm('Archive this project?')) return;
    const key = `${project.owner_uid}-${project.id}`;
    setActionLoading(key);
    try {
      if (project.owner_uid === currentUid) {
        await Project.update(project.id, { status: 'archived' });
      } else {
        await Core.AdminUpdateProject({
          uid: project.owner_uid,
          projectId: project.id,
          data: { status: 'archived' },
        });
      }
      await loadProjects();
    } catch (err) {
      alert('Error archiving project: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const resetStage = async (project) => {
    if (!confirm('Reset this project to Stage 1?')) return;
    const key = `${project.owner_uid}-${project.id}`;
    setActionLoading(key);
    try {
      if (project.owner_uid === currentUid) {
        await Project.update(project.id, RESET_PAYLOAD);
      } else {
        await Core.AdminUpdateProject({
          uid: project.owner_uid,
          projectId: project.id,
          data: RESET_PAYLOAD,
        });
      }
      await loadProjects();
    } catch (err) {
      alert('Error resetting project: ' + (err?.message || 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className={`flex items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
        Loading all projects...
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
            <Button variant="outline" size="sm" onClick={loadProjects} className="border-red-500/50 text-red-600 hover:bg-red-500/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`} />
              <Input
                placeholder="Search by title, disease, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Project List */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardHeader>
          <CardTitle className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>
            All projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProjects.length === 0 ? (
              <p className={`py-8 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                {projects.length === 0 && !error ? 'No projects yet.' : 'No projects match your filters.'}
              </p>
            ) : (
              filteredProjects.map((project) => {
                const actionKey = `${project.owner_uid}-${project.id}`;
                const isActionLoading = actionLoading === actionKey;
                const ownerLabel = project.owner_email || project.owner_name || project.created_by || 'Unknown';
                return (
                  <div
                    key={actionKey}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            {project.title || 'Untitled'}
                          </p>
                          <Badge className={
                            project.status === 'active' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                            project.status === 'completed' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }>
                            {project.status}
                          </Badge>
                        </div>
                        {project.disease_name && (
                          <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                            Disease: {project.disease_name}
                          </p>
                        )}
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          Owner: {ownerLabel} • Stage {(project.current_stage ?? 0) + 1}/7
                        </p>
                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                          Updated: {project.updated_date ? new Date(project.updated_date).toLocaleDateString() : '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={createPageUrl('Lab') + `?project=${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded hover:bg-slate-700 transition-colors"
                          title="View Project"
                        >
                          <ExternalLink className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                        </a>
                        <button
                          onClick={() => resetStage(project)}
                          disabled={isActionLoading}
                          className="p-2 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
                          title="Reset to Stage 1"
                        >
                          <RotateCcw className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} ${isActionLoading ? 'animate-spin' : ''}`} />
                        </button>
                        {project.status !== 'archived' && (
                          <button
                            onClick={() => archiveProject(project)}
                            disabled={isActionLoading}
                            className="p-2 rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
                            title="Archive Project"
                          >
                            <Archive className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}