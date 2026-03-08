import React, { useState, useEffect } from 'react';
import { Project } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink, Archive, RotateCcw } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { createPageUrl } from '../../utils';

export default function ProjectViewer() {
  const { theme } = useTheme();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchTerm, statusFilter, projects]);

  const loadProjects = async () => {
    try {
      const allProjects = await Project.list('-updated_date');
      setProjects(allProjects);
      setFilteredProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.disease_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.created_by?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const archiveProject = async (projectId) => {
    if (!confirm('Archive this project?')) return;
    try {
      await Project.update(projectId, { status: 'archived' });
      await loadProjects();
    } catch (error) {
      alert('Error archiving project: ' + error.message);
    }
  };

  const resetStage = async (projectId) => {
    if (!confirm('Reset this project to Stage 1?')) return;
    try {
      await Project.update(projectId, { 
        current_stage: 0,
        stage_status: {
          0: 'active',
          1: 'locked',
          2: 'locked',
          3: 'locked',
          4: 'locked',
          5: 'locked',
          6: 'locked'
        }
      });
      await loadProjects();
      alert('Project reset successfully!');
    } catch (error) {
      alert('Error resetting project: ' + error.message);
    }
  };

  if (loading) {
    return <div className={theme === 'dark' ? 'text-white' : 'text-slate-900'}>Loading projects...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className={theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`} />
              <Input
                placeholder="Search projects..."
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
            Projects ({filteredProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
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
                      Owner: {project.created_by} • Stage {(project.current_stage || 0) + 1}/7
                    </p>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}>
                      Updated: {new Date(project.updated_date).toLocaleDateString()}
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
                      onClick={() => resetStage(project.id)}
                      className="p-2 rounded hover:bg-slate-700 transition-colors"
                      title="Reset to Stage 1"
                    >
                      <RotateCcw className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                    </button>
                    {project.status !== 'archived' && (
                      <button
                        onClick={() => archiveProject(project.id)}
                        className="p-2 rounded hover:bg-slate-700 transition-colors"
                        title="Archive Project"
                      >
                        <Archive className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                      </button>
                    )}
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