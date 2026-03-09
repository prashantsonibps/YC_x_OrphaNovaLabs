import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { auth } from '@/api/authClient';
import { Project } from '@/api/entities';
import { useAuth } from '@/contexts/AuthContext';
import { createPageUrl } from '../utils/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Search, Database, Lightbulb, FlaskConical, 
  BarChart3, FileText
} from 'lucide-react';

import Sidebar from '../components/lab/Sidebar';
import NovusAssistant from '../components/lab/NovusAssistantEnhanced';
import Header from '../components/shared/Header';
import { ThemeProvider, useTheme } from '../components/ThemeContext';
import StageUpload from '../components/lab/stages/StageUploadNew';
import StageLiterature from '../components/lab/stages/StageLiterature';
import StageEvidence from '../components/lab/stages/StageEvidence';
import StageHypothesis from '../components/lab/stages/StageHypothesis';
import StageExperiments from '../components/lab/stages/StageExperimentsNew';
import StageReview from '../components/lab/stages/StageReview';
import StageDraft from '../components/lab/stages/StageDraft';

const DNAStrand = ({ className }) => (
  <div className={`absolute w-full h-full ${className}`} style={{ perspective: '400px' }}>
    <div className="absolute w-full h-full animate-dna-rotate">
      {[...Array(20)].map((_, i) => (
        <div 
          key={i} 
          className="absolute w-2 h-2 rounded-full bg-blue-400/40"
          style={{
            left: '50%',
            top: `${5 + i * 4.5}%`,
            transform: `translateX(-50%) rotateY(${i * 36}deg) translateZ(80px)`
          }}
        />
      ))}
      {[...Array(20)].map((_, i) => (
        <div 
          key={i} 
          className="absolute w-2 h-2 rounded-full bg-cyan-400/40"
          style={{
            left: '50%',
            top: `${5 + i * 4.5}%`,
            transform: `translateX(-50%) rotateY(${i * 36 + 180}deg) translateZ(80px)`
          }}
        />
      ))}
    </div>
  </div>
);

const STAGES = [
  { id: 0, name: 'Upload & Context', icon: Upload },
  { id: 1, name: 'Literature Retrieval', icon: Search },
  { id: 2, name: 'Evidence Extraction', icon: Database },
  { id: 3, name: 'Hypothesis Generation', icon: Lightbulb },
  { id: 4, name: 'Experiment Suggestions', icon: FlaskConical },
  { id: 5, name: 'Paper Drafting', icon: FileText },
  { id: 6, name: 'Review & Scoring', icon: BarChart3 }
];

function LabContent() {
  const REQUEST_TIMEOUT_MS = 10000;
  const withTimeout = (promise, ms = REQUEST_TIMEOUT_MS) => {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  };

  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [currentStage, setCurrentStage] = useState(0);
  const [autoSaving, setAutoSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [novusOpen, setNovusOpen] = useState(false);
  const [novusWidth, setNovusWidth] = useState(384);

  const projectIdFromUrl = searchParams.get('project');
  useEffect(() => {
    if (!userProfile) return;
    setLoading(true);
    setLoadError('');
    let cancelled = false;
    const run = async () => {
      try {
        setUser(userProfile);
        await loadProject(userProfile, projectIdFromUrl);
      } catch (error) {
        if (!cancelled) console.error('Load error:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [projectIdFromUrl, userProfile]);

  // Auto-close sidebar after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const loadProject = async (currentUser, projectIdFromUrl) => {
    try {
      const projectId = projectIdFromUrl ?? searchParams.get('project');

      let project;
      if (projectId) {
        // Direct doc lookup is reliable for project id.
        project = await withTimeout(Project.get(projectId));
      } else {
        let projects = await withTimeout(Project.filter(
          { status: 'active' },
          '-updated_date',
          1
        ));
        project = projects[0];
      }

      if (project) {
        setCurrentProject(project);
        setCurrentStage(project.current_stage || 0);
        setLoadError('');
      } else {
        setCurrentProject(null);
        setLoadError('Project not found. It may have failed to save.');
        navigate('/Dashboard');
      }
    } catch (error) {
      console.error('Project load error:', error);
      setCurrentProject(null);
      setLoadError(error?.message || 'Failed to load project.');
    } finally {
      setLoading(false);
    }
  };

  const handleStageComplete = async (stageId) => {
    const newStageStatus = { ...currentProject.stage_status };
    newStageStatus[stageId] = 'completed';
    if (stageId < 6) {
      newStageStatus[stageId + 1] = 'active';
    }

    await Project.update(currentProject.id, {
      current_stage: Math.min(stageId + 1, 6),
      stage_status: newStageStatus
    });

    setCurrentStage(Math.min(stageId + 1, 6));
    
    // Reload project
    const updated = await Project.list();
    const found = updated.find(p => p.id === currentProject.id);
    if (found) setCurrentProject(found);
  };

  // Handle NOVUS stage actions
  const handleStageAction = async (action, params = {}) => {
    const stageComponents = {
      0: null, // Upload handled directly
      1: null, // Will trigger literature search
      2: null, // Will trigger evidence extraction
      3: null, // Will trigger hypothesis generation
      4: null, // Will trigger experiment design
      5: null, // Will trigger review
      6: null  // Will trigger draft generation
    };

    // Trigger the appropriate stage action
    // This will be handled by the stage components themselves
    // NOVUS just sends the command, stages listen and execute
    
    // For now, we'll use a simple event system
    window.dispatchEvent(new CustomEvent('novus-action', { 
      detail: { action, params, projectId: currentProject.id } 
    }));
  };

  // Handle NOVUS stage transition
  const handleStageTransition = async (newStage) => {
    await handleStageComplete(currentStage);
  };

  const handleSaveProjectName = async (newName) => {
    if (!newName.trim()) return;
    
    await Project.update(currentProject.id, { title: newName });
    setCurrentProject({ ...currentProject, title: newName });
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentProject) return;
    
    const interval = setInterval(async () => {
      setAutoSaving(true);
      await Project.update(currentProject.id, {
        last_saved: new Date().toISOString()
      });
      setTimeout(() => setAutoSaving(false), 1000);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentProject]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Loading OrphaNova Labs...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-6 ${
        theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'
      }`}>
        <div className={`max-w-lg w-full rounded-xl p-6 border ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <h2 className="text-xl font-semibold mb-2">Unable to open project</h2>
          <p className={`text-sm mb-5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            {loadError || 'The project could not be loaded right now.'}
          </p>
          <button
            onClick={() => navigate('/Dashboard')}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderStage = () => {
    const stageProps = {
      project: currentProject,
      onComplete: () => handleStageComplete(currentStage),
      onUpdate: (data) => setCurrentProject({ ...currentProject, ...data })
    };

    // Note: Each stage component will handle its own data fetching for stage-specific context
    switch (currentStage) {
      case 0: return <StageUpload {...stageProps} />;
      case 1: return <StageLiterature {...stageProps} />;
      case 2: return <StageEvidence {...stageProps} />;
      case 3: return <StageHypothesis {...stageProps} />;
      case 4: return <StageExperiments {...stageProps} />;
      case 5: return <StageDraft {...stageProps} />;
      case 6: return <StageReview {...stageProps} />;
      default: return <StageUpload {...stageProps} />;
    }
  };

  return (
    <div className={`relative min-h-screen flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-slate-950' : 'bg-stone-50'
    }`}>
      <style>{`
        @keyframes dna-rotate {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .animate-dna-rotate {
          animation: dna-rotate 20s linear infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* Animated DNA Background */}
      <div className="fixed inset-0 z-0">
        <div className={`absolute inset-0 ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950'
            : 'bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-50'
        }`}></div>
        <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-20' : 'opacity-10'}`}>
          <DNAStrand className="top-0 left-1/12" />
          <DNAStrand className="bottom-0 right-1/12" />
        </div>
        <div className="absolute inset-0">
          <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${
            theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-400/5'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${
            theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-400/5'
          }`}></div>
        </div>
      </div>

      {/* Main Layout */}
      <motion.div 
        className="relative z-10 flex flex-col flex-1 overflow-hidden"
        initial={false}
        animate={{ marginRight: novusOpen ? novusWidth : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        {/* Header */}
        <Header 
          user={user} 
          onUserUpdate={setUser}
          projectName={currentProject.title}
          onProjectNameChange={handleSaveProjectName}
          isLabPage={true}
        />

        {/* Content Layout with Sidebar */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Floating Sidebar - Centered on Screen (Fixed) */}
          <div className="fixed left-4 top-1/2 -translate-y-1/2 z-20">
            <Sidebar 
              stages={STAGES}
              currentStage={currentStage}
              stageStatus={currentProject.stage_status}
              onStageClick={(id) => {
                if (currentProject.stage_status[id] !== 'locked') {
                  setCurrentStage(id);
                }
              }}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </div>

          {/* Content Wrapper */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Main Content with dynamic margin */}
            <motion.div 
              className="flex-1 overflow-auto"
              initial={false}
              animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  {renderStage()}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Footer with Auto-save Indicator */}
            {autoSaving && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className={`h-8 flex items-center justify-center backdrop-blur-md border-t ${
                  theme === 'dark'
                    ? 'bg-slate-900/50 border-slate-700/50'
                    : 'bg-white/50 border-slate-200/50'
                }`}
              >
                <span className="text-xs text-green-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  Auto-saving...
                </span>
              </motion.div>
            )}
          </div>

          {/* NOVUS AI Assistant - Central Command Hub */}
          <NovusAssistant 
            project={currentProject}
            currentStage={currentStage}
            isOpen={novusOpen}
            onToggle={setNovusOpen}
            width={novusWidth}
            onWidthChange={setNovusWidth}
            onStageAction={handleStageAction}
            onStageTransition={handleStageTransition}
          />
        </div>

        {/* Footer - removed for now, can re-add via shared/Footer */}
      </motion.div>
    </div>
  );
}

export default function Lab() {
  return (
    <ThemeProvider>
      <LabContent />
    </ThemeProvider>
  );
}