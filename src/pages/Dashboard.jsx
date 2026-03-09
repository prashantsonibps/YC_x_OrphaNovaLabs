import React, { useState, useEffect } from 'react';
import { auth } from '@/api/authClient';
import { Project } from '@/api/entities';
import { migrateLocalStorageToFirestore } from '@/api/entitiesClient';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Plus, Play, Archive, CheckCircle2, Clock,
  Trash2, FolderOpen, Pencil, Check, X } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils/navigation';
import WelcomeAnimation from '../components/lab/WelcomeAnimation';
import Header from '../components/shared/Header';
import { ThemeProvider, useTheme } from '../components/ThemeContext';

const DNAStrand = ({ className }) =>
<div className={`absolute w-full h-full ${className}`} style={{ perspective: '400px' }}>
    <div className="absolute w-full h-full animate-dna-rotate">
      {[...Array(20)].map((_, i) =>
    <div
      key={i}
      className="absolute w-2 h-2 rounded-full bg-blue-400/40"
      style={{
        left: '50%',
        top: `${5 + i * 4.5}%`,
        transform: `translateX(-50%) rotateY(${i * 36}deg) translateZ(80px)`
      }} />

    )}
      {[...Array(20)].map((_, i) =>
    <div
      key={i}
      className="absolute w-2 h-2 rounded-full bg-cyan-400/40"
      style={{
        left: '50%',
        top: `${5 + i * 4.5}%`,
        transform: `translateX(-50%) rotateY(${i * 36 + 180}deg) translateZ(80px)`
      }} />

    )}
    </div>
  </div>;


const STAGE_NAMES = [
'Upload & Context',
'Literature Retrieval',
'Evidence Extraction',
'Hypothesis Generation',
'Experiment Suggestions',
'Review & Scoring',
'Paper Drafting'];


function DashboardContent() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, completed: 0, archived: 0 });
  const [showWelcome, setShowWelcome] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    if (userProfile) {
      setUser(userProfile);
      loadProjects();
    }
  }, [userProfile]);

  const loadProjects = async () => {
    try {
      // Migration: fire-and-forget, don't block dashboard load
      migrateLocalStorageToFirestore().catch((err) =>
        console.warn('Migration skipped:', err.message)
      );

      const isFirstTime = !localStorage.getItem('orphanova-dashboard-visited');
      if (isFirstTime) {
        setShowWelcome(true);
        localStorage.setItem('orphanova-dashboard-visited', 'true');
        setTimeout(() => setShowWelcome(false), 2000);
      }

      const allProjects = await Project.filter({}, '-updated_date');

      setProjects(allProjects);

      const active = allProjects.filter((p) => p.status === 'active').length;
      const completed = allProjects.filter((p) => p.status === 'completed').length;
      const archived = allProjects.filter((p) => p.status === 'archived').length;
      setStats({ active, completed, archived });
    } catch (error) {
      console.error('Load error:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    try {
      const newProject = await Project.create({
        title: `Research Project ${projects.length + 1}`,
        disease_name: '',
        symptoms: '',
        current_stage: 0,
        stage_status: {
          0: 'active',
          1: 'locked',
          2: 'locked',
          3: 'locked',
          4: 'locked',
          5: 'locked',
          6: 'locked'
        },
        status: 'active',
      });

      navigate({ pathname: '/Lab', search: `?project=${encodeURIComponent(newProject.id)}` });
    } catch (error) {
      console.error('Create project error:', error);
    }
  };

  const archiveProject = async (projectId) => {
    await Project.update(projectId, { status: 'archived' });
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, status: 'archived' } : p));
    setStats((prev) => ({ ...prev, active: prev.active - 1, archived: prev.archived + 1 }));
  };

  const deleteProject = async (projectId) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;

    await Project.update(projectId, { status: 'archived' });
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  };

  const startEditingTitle = (project) => {
    setEditingProjectId(project.id);
    setEditingTitle(project.title);
  };

  const saveTitle = async (projectId) => {
    if (!editingTitle.trim()) return;

    await Project.update(projectId, { title: editingTitle });
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, title: editingTitle } : p));
    setEditingProjectId(null);
    setEditingTitle('');
  };

  const cancelEdit = () => {
    setEditingProjectId(null);
    setEditingTitle('');
  };

  const getProgressPercentage = (project) => {
    const currentStage = project.current_stage || 0;
    return Math.round(currentStage / 6 * 100);
  };

  const getStatusColor = (status) => {
    if (theme === 'dark') {
      switch (status) {
        case 'active':return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'completed':return 'bg-green-500/20 text-green-300 border-green-500/30';
        case 'archived':return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        default:return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      }
    } else {
      switch (status) {
        case 'active':return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'completed':return 'bg-green-100 text-green-700 border-green-300';
        case 'archived':return 'bg-gray-100 text-gray-700 border-gray-300';
        default:return 'bg-slate-100 text-slate-700 border-slate-300';
      }
    }
  };

  if (showWelcome) {
    return <WelcomeAnimation />;
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`
      }>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Loading Dashboard...</p>
        </div>
      </div>);

  }

  const activeProjects = projects.filter((p) => p.status === 'active');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const archivedProjects = projects.filter((p) => p.status === 'archived');

  return (
    <div className={`min-h-screen ${
    theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`
    }>
      <style>{`
        @keyframes dna-rotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .animate-dna-rotate {
          animation: dna-rotate 20s linear infinite;
          transform-style: preserve-3d;
        }
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
        body {
          font-family: 'IBM Plex Sans', sans-serif;
        }
      `}</style>

      {/* Animated DNA Background */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute inset-0 ${
        theme === 'dark' ?
        'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950' :
        'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50'}`
        }></div>
        <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-20' : 'opacity-10'}`}>
          <DNAStrand className="top-0 left-1/12" />
          <DNAStrand className="bottom-0 right-1/12" />
        </div>
        <div className="absolute inset-0">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${
          theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-400/5'}`
          }></div>
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${
          theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-400/5'}`
          }></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <Header user={user} onUserUpdate={setUser} isLabPage={false} />

        {/* Welcome Card */}
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}>

            <Card className={`backdrop-blur-md ${
            theme === 'dark' ?
            'bg-slate-900/40 border-slate-700/50' :
            'bg-white/40 border-slate-200/50'}`
            }>
              <CardContent className="p-6 text-center">
                <h2 className={`text-2xl font-bold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'}`
                }>
                  Welcome, {user?.full_name || 'Researcher'}
                </h2>
                <p className={`leading-relaxed ${
                theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`
                }>OrphaNova is a 7-stage AI research pipeline built specifically for rare disease research. Upload a disease name, patient symptoms, case reports, or research PDFs - OrphaNova retrieves relevant literature, extracts and validates disease-gene relationships against Open Targets, predicts protein structures via AlphaFold2, screens drug candidates in parallel using RDKit, computes binding affinity with Chai-1 molecular docking, surfaces active clinical trials from ClinicalTrials.gov, and generates a publication-ready research paper.



                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* New Project Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mt-6">

            <Button
              onClick={createNewProject}
              className={`text-lg px-8 py-6 h-auto font-semibold shadow-xl ${
              theme === 'dark' ?
              'bg-white hover:bg-slate-100 text-slate-900' :
              'bg-slate-900 hover:bg-slate-800 text-white'}`
              }>

              <Plus className="w-6 h-6 mr-2" />
              New Project
            </Button>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className={`${
            theme === 'dark' ?
            'bg-slate-800/50 border-slate-700' :
            'bg-white/50 border-slate-200'}`
            }>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                    }>Active Projects</p>
                    <p className="text-4xl font-bold text-blue-400">{stats.active}</p>
                  </div>
                  <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Play className="w-7 h-7 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${
            theme === 'dark' ?
            'bg-slate-800/50 border-slate-700' :
            'bg-white/50 border-slate-200'}`
            }>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                    }>Completed</p>
                    <p className="text-4xl font-bold text-green-400">{stats.completed}</p>
                  </div>
                  <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${
            theme === 'dark' ?
            'bg-slate-800/50 border-slate-700' :
            'bg-white/50 border-slate-200'}`
            }>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm mb-1 ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                    }>Archived</p>
                    <p className="text-4xl font-bold text-slate-400">{stats.archived}</p>
                  </div>
                  <div className="w-14 h-14 bg-slate-500/20 rounded-full flex items-center justify-center">
                    <Archive className="w-7 h-7 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Projects */}
          {activeProjects.length > 0 &&
          <div className="mb-8">
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'}`
            }>
                <Play className="w-5 h-5 text-blue-400" />
                Active Projects
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeProjects.map((project) =>
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}>

                    <Card className={`transition-all cursor-pointer group overflow-hidden ${
                theme === 'dark' ?
                'bg-slate-800/50 border-slate-700 hover:border-blue-500/50' :
                'bg-white/50 border-slate-200 hover:border-blue-500/50'}`
                }>
                      <div className="relative h-32 overflow-hidden">
                        <img
                          src={[
                            'https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800',
                            'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800',
                            'https://images.unsplash.com/photo-1530973428-5bf2db2e4d71?w=800',
                            'https://images.unsplash.com/photo-1582719471137-c3967ffb1c42?w=800'
                          ][Math.abs(project.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 4]}
                          alt={project.title}
                          className="w-full h-full object-cover opacity-40"
                        />
                        <div className={`absolute inset-0 ${
                          theme === 'dark' ? 'bg-gradient-to-t from-slate-800/90 to-transparent' : 'bg-gradient-to-t from-white/90 to-transparent'
                        }`}></div>
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {editingProjectId === project.id ?
                        <div className="flex items-center gap-2 mb-2">
                                <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && saveTitle(project.id)}
                            className={`flex-1 border rounded px-3 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              theme === 'dark' ? 'bg-slate-900 border-blue-500/50 text-white' : 'bg-white border-blue-500 text-slate-900'
            }`}
                            autoFocus />

                                <button
                            onClick={() => saveTitle(project.id)}
                            className="p-2 bg-green-500 hover:bg-green-600 rounded text-white">

                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                            onClick={cancelEdit}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-white">

                                  <X className="w-4 h-4" />
                                </button>
                              </div> :

                        <CardTitle className={`text-lg mb-2 flex items-center gap-2 group ${
                        theme === 'dark' ? 'text-white' : 'text-slate-900'}`
                        }>
                                {project.title || 'Untitled Project'}
                                <button
                            onClick={() => startEditingTitle(project)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                            theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`
                            }>

                                  <Pencil className={`w-3 h-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                                </button>
                              </CardTitle>
                        }
                            {project.disease_name &&
                        <p className={`text-sm ${
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                        }>
                                Disease: <span className={theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}>{project.disease_name}</span>
                              </p>
                        }
                          </div>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Progress */}
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>Progress</span>
                              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{getProgressPercentage(project)}%</span>
                            </div>
                            <div className={`w-full h-2 rounded-full overflow-hidden ${
                            theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`
                            }>
                              <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${getProgressPercentage(project)}%` }}>
                          </div>
                            </div>
                            <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                              Stage {(project.current_stage || 0) + 1}/7: {STAGE_NAMES[project.current_stage || 0]}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Link to={createPageUrl('Lab') + `?project=${project.id}`} className="flex-1">
                              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                <Play className="w-4 h-4 mr-2" />
                                Continue
                              </Button>
                            </Link>
                            <Button
                          onClick={() => archiveProject(project.id)}
                          variant="outline"
                          className="border-slate-700 hover:border-slate-600">

                              <Archive className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Last Updated */}
                          <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            Updated {new Date(project.updated_date).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
              )}
              </div>
            </div>
          }

          {/* Empty State */}
          {activeProjects.length === 0 && completedProjects.length === 0 &&
          <Card className={`${
          theme === 'dark' ?
          'bg-slate-800/50 border-slate-700' :
          'bg-white/50 border-slate-200'}`
          }>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className={`text-xl font-bold mb-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'}`
              }>No Projects Yet</h3>
                <p className={`mb-6 ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
              }>Create your first research project to get started</p>
                <Button
                onClick={createNewProject}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">

                  <Plus className="w-4 h-4 mr-2" />
                  Create First Project
                </Button>
              </CardContent>
            </Card>
          }

          {/* Completed Projects */}
          {completedProjects.length > 0 &&
          <div className="mb-8">
              <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'}`
            }>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Completed Projects
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {completedProjects.map((project) =>
              <Card key={project.id} className={`border-green-500/30 ${
              theme === 'dark' ? 'bg-slate-800/50' : 'bg-white/50'}`
              }>
                    <CardHeader>
                      <CardTitle className={`text-lg flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-900'}`
                      }>
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        {project.title || 'Untitled Project'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-sm mb-4 ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
                      }>
                        Disease: <span className={theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}>{project.disease_name || 'N/A'}</span>
                      </p>
                      <Link to={createPageUrl('Lab') + `?project=${project.id}`}>
                        <Button variant="outline" className="w-full border-green-500/30 text-green-300 hover:bg-green-500/10">
                          View Details
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
              )}
              </div>
            </div>
          }
        </div>

        {/* Footer - removed for now, can re-add via shared/Footer */}
      </div>
    </div>);

}

export default function Dashboard() {
  return (
    <ThemeProvider>
      <DashboardContent />
    </ThemeProvider>);

}