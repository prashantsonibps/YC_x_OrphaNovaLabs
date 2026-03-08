import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Eye, Paperclip, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Note, Literature, Relation, Hypothesis, Experiment, Review } from '@/api/entities';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '../ThemeContext';
import ReactMarkdown from 'react-markdown';

const STAGE_NAMES = [
  'Upload & Context',
  'Literature Retrieval',
  'Evidence Extraction',
  'Hypothesis Generation',
  'Experiment Suggestions',
  'Review & Scoring',
  'Paper Drafting'
];

/**
 * Enhanced NOVUS Assistant - Central Command Hub
 * Handles: file uploads, stage actions, search refinement, stage transitions
 */
export default function NovusAssistantEnhanced({ 
  project, 
  currentStage, 
  isOpen, 
  onToggle, 
  width, 
  onWidthChange, 
  onStageAction,
  onStageTransition 
}) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [mode, setMode] = useState('chat');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const messagesEndRef = useRef(null);
  const activityTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const stageName = STAGE_NAMES[currentStage] || 'your research';
      const greeting = mode === 'chat' 
        ? `Hello! I'm **NOVUS**, your AI research collaborator with expertise in rare disease research and scientific methodology.\n\nI see you're working on **${project?.title || 'your project'}** at the **${stageName}** stage.\n\n**What I bring:**\n• Strategic research guidance\n• Critical methodology analysis\n• Evidence synthesis\n• Hypothesis refinement\n• Experimental design\n\nLet's collaborate deeply on your research. What would you like to explore?`
        : `I'm **NOVUS** in observation mode - watching your research like a senior professor.\n\n**Project:** ${project?.title || 'your project'}\n**Stage:** ${stageName}\n\nI'll observe and provide guidance when I notice something worth discussing. Continue your work - I'm here if you need me.`;
      
      addNovusMessage(greeting);
    }
  }, [isOpen, mode]);

  // Reset messages when project changes
  useEffect(() => {
    if (project?.id) {
      setMessages([]);
    }
  }, [project?.id]);

  // Watch mode - professorial observations
  useEffect(() => {
    const hasNudged = sessionStorage.getItem(`novus_nudged_${project?.id}`);
    
    if (mode === 'watch' && isOpen && !hasNudged) {
      const timer = setTimeout(() => {
        const timeSinceActivity = Date.now() - lastActivity;
        if (timeSinceActivity > 45000) {
          const insights = [
            "I've been observing your approach. Have you considered how this methodology aligns with your validation strategy?",
            "Interesting. Sometimes stepping back reveals patterns we miss up close. What's your current thinking?",
            "From experience, this stage benefits from methodological review. Want to discuss your selection criteria?",
            "I notice deliberation here. In rare disease research, thoroughness at this stage pays dividends later. Thoughts?"
          ];
          const insight = insights[Math.floor(Math.random() * insights.length)];
          addNovusMessage(insight);
          sessionStorage.setItem(`novus_nudged_${project?.id}`, 'true');
        }
      }, 45000);

      activityTimerRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [mode, isOpen, lastActivity, project?.id]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    
    if (mode === 'watch') {
      window.addEventListener('click', handleActivity);
      window.addEventListener('scroll', handleActivity);
      window.addEventListener('keypress', handleActivity);
      
      return () => {
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        window.removeEventListener('keypress', handleActivity);
      };
    }
  }, [mode]);

  const addNovusMessage = (text) => {
    setMessages(prev => [...prev, { text, sender: 'novus', timestamp: new Date() }]);
  };

  const addUserMessage = (text, attachments = []) => {
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date(), attachments }]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    const uploadedAttachments = [];

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedAttachments.push({
          name: file.name,
          url: file_url,
          type: file.type.startsWith('image/') ? 'image' : 'file'
        });
      } catch (error) {
        console.error('Upload error:', error);
      }
    }

    setUploadingFiles(false);

    // Save attachments to project notes
    if (uploadedAttachments.length > 0) {
      await Note.create({
        project_id: project.id,
        stage_id: currentStage,
        content: `Uploaded ${uploadedAttachments.length} file(s) via NOVUS`,
        attachments: uploadedAttachments
      });

      addUserMessage(`Uploaded ${uploadedAttachments.length} file(s)`, uploadedAttachments);
      addNovusMessage(`✅ Successfully uploaded **${uploadedAttachments.length} file(s)**. I've saved them to your project. These will be used for context in your research.`);
    }
  };

  const detectIntent = (message) => {
    const lower = message.toLowerCase();
    
    // File/Note uploads
    if (lower.includes('upload') || lower.includes('add note') || lower.includes('attach')) {
      return { type: 'upload', confidence: 'high' };
    }
    
    // Search/Literature actions
    if (lower.includes('search') || lower.includes('find papers') || lower.includes('literature')) {
      return { type: 'search_literature', confidence: 'high', query: message };
    }
    
    // Refine search
    if ((lower.includes('refine') || lower.includes('filter')) && currentStage === 1) {
      return { type: 'refine_search', confidence: 'high', query: message };
    }
    
    // Extract evidence
    if (lower.includes('extract') || (lower.includes('evidence') && currentStage === 2)) {
      return { type: 'extract_evidence', confidence: 'high' };
    }
    
    // Generate hypotheses
    if (lower.includes('hypothesis') || lower.includes('hypotheses') || (lower.includes('generate') && currentStage === 3)) {
      return { type: 'generate_hypotheses', confidence: 'high' };
    }
    
    // Design experiments
    if (lower.includes('experiment') || (lower.includes('design') && currentStage === 4)) {
      return { type: 'design_experiments', confidence: 'high' };
    }
    
    // Run review
    if (lower.includes('review') || (lower.includes('score') && currentStage === 5)) {
      return { type: 'run_review', confidence: 'high' };
    }
    
    // Generate draft
    if (lower.includes('draft') || lower.includes('paper') || (lower.includes('write') && currentStage === 6)) {
      return { type: 'generate_draft', confidence: 'high' };
    }
    
    // Next stage
    if (lower.includes('next stage') || lower.includes('continue') || lower.includes('move forward')) {
      return { type: 'next_stage', confidence: 'high' };
    }
    
    // General question
    return { type: 'question', confidence: 'medium' };
  };

  const handleActionCommand = async (intent, userMessage) => {
    switch (intent.type) {
      case 'upload':
        fileInputRef.current?.click();
        addNovusMessage(mode === 'chat' 
          ? "I've opened the file picker. Upload PDFs, images, or data files - I'll integrate them into your research context and help you extract key insights."
          : "File picker ready. Choose wisely - each piece of context shapes the downstream analysis.");
        break;
        
      case 'search_literature':
        addNovusMessage(mode === 'chat'
          ? "Initiating comprehensive literature search across PubMed, Orphanet, and arXiv. I'll prioritize recent publications and high-impact studies..."
          : "Running search. Consider: are we casting the net wide enough or too wide? Precision vs. recall matters here.");
        if (onStageAction) {
          await onStageAction('search_literature', { query: intent.query });
        }
        addNovusMessage(mode === 'chat'
          ? "✅ Search complete. I've retrieved papers ranked by relevance. Focus on those with strong methodologies - quality evidence beats quantity."
          : "Results ready. Review methodologies carefully - weak studies dilute strong ones.");
        break;
        
      case 'refine_search':
        addNovusMessage("🔄 Refining your search...");
        if (onStageAction) {
          await onStageAction('refine_search', { query: intent.query });
        }
        addNovusMessage("✅ Search refined! Check the updated results.");
        break;
        
      case 'extract_evidence':
        addNovusMessage("🧬 Extracting relationships from selected papers...");
        if (onStageAction) {
          await onStageAction('extract_evidence');
        }
        addNovusMessage("✅ Evidence extracted! Please validate each relationship.");
        break;
        
      case 'generate_hypotheses':
        addNovusMessage("💡 Generating research hypotheses...");
        if (onStageAction) {
          await onStageAction('generate_hypotheses');
        }
        addNovusMessage("✅ Hypotheses generated! Review and approve the ones you want to pursue.");
        break;
        
      case 'design_experiments':
        addNovusMessage("🔬 Designing validation experiments...");
        if (onStageAction) {
          await onStageAction('design_experiments');
        }
        addNovusMessage("✅ Experiments designed! You can run AI simulations or add your own results.");
        break;
        
      case 'run_review':
        addNovusMessage("📊 Running comprehensive review...");
        if (onStageAction) {
          await onStageAction('run_review');
        }
        addNovusMessage("✅ Review complete! Check your scores and feedback.");
        break;
        
      case 'generate_draft':
        addNovusMessage("📝 Generating paper draft...");
        if (onStageAction) {
          await onStageAction('generate_draft');
        }
        addNovusMessage("✅ Draft generated! You can edit each section and export when ready.");
        break;
        
      case 'next_stage':
        await handleNextStage();
        break;
        
      default:
        // Handle as normal question
        return false;
    }
    
    return true;
  };

  const handleNextStage = async () => {
    // Check requirements for current stage
    const requirements = await checkStageRequirements();
    
    if (!requirements.canProceed) {
      addNovusMessage(`⚠️ **Cannot move to next stage yet.**\n\n${requirements.reason}\n\n${requirements.suggestion}`);
      return;
    }
    
    // Show summary
    addNovusMessage(`✅ **Stage ${currentStage + 1} Complete!**\n\n${requirements.summary}\n\nReady to move to **${STAGE_NAMES[currentStage + 1]}**?`);
    
    // Add confirmation buttons (simulated)
    setTimeout(() => {
      if (onStageTransition) {
        onStageTransition(currentStage + 1);
        addNovusMessage(`🚀 Moving to **${STAGE_NAMES[currentStage + 1]}**. Let's keep going!`);
      }
    }, 1000);
  };

  const checkStageRequirements = async () => {
    switch (currentStage) {
      case 0: // Upload
        if (!project.ai_context_summary) {
          return {
            canProceed: false,
            reason: "You haven't analyzed your research context yet.",
            suggestion: "Please fill in disease information and click 'Analyze Context' first."
          };
        }
        return {
          canProceed: true,
          summary: `Context analyzed for **${project.disease_name}**. Ready for literature search.`
        };
        
      case 1: // Literature
        const literature = await Literature.filter({ project_id: project.id, selected: true });
        if (literature.length === 0) {
          return {
            canProceed: false,
            reason: "No papers selected for evidence extraction.",
            suggestion: "Please select at least 1 paper from the literature results."
          };
        }
        return {
          canProceed: true,
          summary: `Selected **${literature.length} papers** for evidence extraction.`
        };
        
      case 2: // Evidence
        const validRelations = await Relation.filter({ project_id: project.id, status: 'valid' });
        if (validRelations.length === 0) {
          return {
            canProceed: false,
            reason: "No validated relationships found.",
            suggestion: "Please validate at least 1 relationship before proceeding."
          };
        }
        return {
          canProceed: true,
          summary: `Validated **${validRelations.length} relationships**. Ready for hypothesis generation.`
        };
        
      case 3: // Hypothesis
        const approvedHyps = await Hypothesis.filter({ project_id: project.id, status: 'approved' });
        if (approvedHyps.length === 0) {
          return {
            canProceed: false,
            reason: "No approved hypotheses.",
            suggestion: "Please approve at least 1 hypothesis before moving forward."
          };
        }
        return {
          canProceed: true,
          summary: `Approved **${approvedHyps.length} hypotheses**. Ready for experiment design.`
        };
        
      case 4: // Experiments
        const ratedExps = await Experiment.filter({ project_id: project.id });
        const allRated = ratedExps.every(e => e.feasibility_score && e.impact_score && e.novelty_score);
        if (!allRated) {
          return {
            canProceed: false,
            reason: "Not all experiments have been rated.",
            suggestion: "Please rate all experiments (feasibility, impact, novelty) before proceeding."
          };
        }
        return {
          canProceed: true,
          summary: `Rated **${ratedExps.length} experiments**. Ready for comprehensive review.`
        };
        
      case 5: // Review
        const review = await Review.filter({ project_id: project.id });
        if (review.length === 0) {
          return {
            canProceed: false,
            reason: "Review hasn't been run yet.",
            suggestion: "Please run the review analysis first."
          };
        }
        return {
          canProceed: true,
          summary: `Review complete with **${review[0].acceptance_likelihood}% acceptance likelihood**. Ready for paper drafting.`
        };
        
      case 6: // Draft
        return {
          canProceed: true,
          summary: "Project complete! You can export your paper now."
        };
        
      default:
        return { canProceed: false, reason: "Unknown stage", suggestion: "" };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    addUserMessage(userMessage);
    setInput('');
    setIsThinking(true);

    try {
      // Detect intent
      const intent = detectIntent(userMessage);
      
      // Handle as action command
      const handled = await handleActionCommand(intent, userMessage);
      
      if (!handled) {
        // Handle based on mode
        const stageName = STAGE_NAMES[currentStage] || 'Unknown';
        const stageContext = `Current stage: ${stageName} (Stage ${currentStage + 1}/7). Project: "${project?.title || 'Untitled'}". Disease: ${project?.disease_name || 'Not specified'}.`;

        let prompt = '';
        
        if (mode === 'chat') {
          // Intelligent Collaborator
          prompt = `You are NOVUS, an expert AI research collaborator with deep knowledge in rare disease research, biomedicine, and scientific methodology.

Context: ${stageContext}
User question: ${userMessage}

As an INTELLIGENT COLLABORATOR:
- Think critically and provide strategic, insightful guidance
- Ask probing questions to deepen understanding
- Suggest alternative approaches or methodologies when relevant
- Connect ideas across research domains
- Identify potential issues or opportunities proactively
- Provide specific, actionable insights (not generic encouragement)
- Reference relevant scientific principles
- If you need more info for a good answer, ask clarifying questions

Think like a senior research scientist with 20+ years experience. Be concise (3-5 sentences) but deeply insightful.

Respond:`;
        } else {
          // Observant Professor
          prompt = `You are NOVUS in "Watch Mode" - observing like an experienced research professor.

Context: ${stageContext}
User question: ${userMessage}

As an OBSERVANT PROFESSOR:
- Provide measured, thoughtful guidance
- Ask Socratic questions that promote deeper thinking
- Point out methodological considerations they might miss
- Focus on the "why" behind research decisions
- Be selective in interventions - make each comment count
- Share wisdom from experience

Speak with the authority of a mentor who knows when insight matters most. Be thoughtful (2-4 sentences).

Respond:`;
        }

        const response = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: false
        });

        addNovusMessage(response);
      }
    } catch (error) {
      console.error('Chat error:', error);
      addNovusMessage("I apologize, but I encountered an error. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  // Handle resize
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        onWidthChange(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => onToggle(true)}
            className="fixed bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center z-50 group hover:scale-110 transition-transform p-2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/978c810d4_OrphaNovaHealthcareStartupLogo4.png"
              alt="NOVUS"
              className="w-full h-full object-contain"
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400/30"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width: `${width}px` }}
            className={`fixed right-0 top-0 h-full backdrop-blur-xl shadow-2xl flex flex-col z-40 ${
              theme === 'dark'
                ? 'bg-slate-900/95 border-l border-slate-700/50'
                : 'bg-white/95 border-l border-slate-200/50'
            }`}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500 transition-colors z-50 ${
                isResizing ? 'bg-blue-500' : 'bg-transparent'
              }`}
            >
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-r ${
                theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'
              }`} />
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/978c810d4_OrphaNovaHealthcareStartupLogo4.png"
                      alt="NOVUS"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">NOVUS AI</h3>
                    <p className="text-xs text-blue-100">Your Research Co-Pilot</p>
                  </div>
                </div>
                <button
                  onClick={() => onToggle(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    mode === 'chat'
                      ? 'bg-white text-blue-600 font-medium'
                      : 'bg-blue-700/50 text-white hover:bg-blue-700'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">Chat Mode</span>
                </button>
                <button
                  onClick={() => setMode('watch')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all ${
                    mode === 'watch'
                      ? 'bg-white text-blue-600 font-medium'
                      : 'bg-blue-700/50 text-white hover:bg-blue-700'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Watch Mode</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        {msg.attachments?.map((att, idx) => (
                          <div key={idx} className="mt-2 text-xs opacity-75 flex items-center gap-1">
                            {att.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                            {att.name}
                          </div>
                        ))}
                      </>
                    ) : (
                      <ReactMarkdown 
                        className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-strong:text-cyan-400"
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                    <p className="text-xs opacity-50 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'
                  }`}>
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-cyan-400 rounded-full"
                          animate={{ y: [0, -8, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.15
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${
              theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
            }`}>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/*,.pdf,.csv,.txt,.doc,.docx"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="icon"
                  disabled={uploadingFiles}
                  className={theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}
                >
                  {uploadingFiles ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask NOVUS anything or give a command..."
                  className={`flex-1 ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                  }`}
                  disabled={isThinking}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isThinking}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-xs text-slate-500 mt-2 text-center">
                {mode === 'chat' ? 'Ask me strategic questions or request actions' : 'I\'m observing - ask when you need guidance'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}