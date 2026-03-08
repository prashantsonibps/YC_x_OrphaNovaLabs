import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle, Eye, Plus, Paperclip, Image as ImageIcon } from 'lucide-react';
import { Core } from '@/api/integrationsClient';
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

export default function NovusAssistant({ project, currentStage, isOpen, onToggle, width, onWidthChange, stageData }) {
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' or 'watch'
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const activityTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const stageName = STAGE_NAMES[currentStage] || 'your research';
      addNovusMessage(`Hello! I'm NOVUS, your AI research collaborator. I can see you're working on **${project?.title || 'your project'}** at the **${stageName}** stage. I'm here to help you succeed. How can I assist you today?`);
    }
  }, [isOpen]);

  // Watch mode - monitor activity
  useEffect(() => {
    if (mode === 'watch' && isOpen) {
      // Reset activity timer
      const timer = setTimeout(() => {
        const timeSinceActivity = Date.now() - lastActivity;
        if (timeSinceActivity > 30000) { // 30 seconds of inactivity
          addNovusMessage("I notice you've been on this page for a while. Would you like me to:\n\n• Explain what this stage involves\n• Suggest next steps\n• Review your current progress\n\nJust let me know!");
        }
      }, 30000);

      activityTimerRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [mode, isOpen, lastActivity]);

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

  const handleSend = async () => {
    if (!input.trim() || isThinking) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user', timestamp: new Date() }]);
    setInput('');
    setIsThinking(true);

    try {
      const stageName = STAGE_NAMES[currentStage] || 'Unknown';
      const stageContext = `Current stage: ${stageName} (Stage ${currentStage + 1}/7). Project: "${project?.title || 'Untitled'}". Disease: ${project?.disease_name || 'Not specified'}.`;
      
      // Add stage-specific data context
      let dataContext = '';
      if (stageData) {
        dataContext = `Current stage data: ${JSON.stringify(stageData).substring(0, 500)}...`;
      }

      const response = await Core.InvokeLLM({
        prompt: `You are NOVUS, a calm, analytical, and supportive AI research collaborator helping with rare disease research. You have deep knowledge of the research workflow.

Context: ${stageContext}
${dataContext}

User question: ${userMessage}

Instructions:
- Provide helpful, concise, scientifically accurate responses (4-5 lines maximum)
- Be brief but complete - answer the question fully in minimal words
- Reference specific data when available (e.g., "I see you've selected 8 papers...")
- Guide the researcher through their current stage
- Use markdown formatting sparingly (only **bold** for key terms)
- Be encouraging and professional
- NEVER write long paragraphs - keep it conversational and short

Respond:`,
        add_context_from_internet: false
      });

      setIsThinking(false);
      addNovusMessage(response);
    } catch (error) {
      setIsThinking(false);
      addNovusMessage("I apologize, but I encountered an error processing your request. Please try again.");
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
      {/* Floating Button - Only show when closed */}
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

      {/* Chat Panel - Fixed to Right Side */}
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
              style={{ touchAction: 'none' }}
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
                    <p className="text-xs text-blue-100">Research Collaborator</p>
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
              
              {mode === 'watch' && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-blue-100 mt-2 text-center"
                >
                  👁️ I'm monitoring your progress and will help when needed
                </motion.p>
              )}
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
                    className={`max-w-[80%] p-3 rounded-lg ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white'
                        : theme === 'dark'
                        ? 'bg-slate-800 text-slate-200 border border-slate-700'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <ReactMarkdown 
                        className="text-sm prose prose-sm max-w-none
                          prose-headings:font-bold prose-headings:mt-2 prose-headings:mb-1
                          prose-p:my-1 prose-p:leading-relaxed
                          prose-strong:font-bold prose-strong:text-cyan-400
                          prose-ul:my-1 prose-li:my-0.5
                          prose-code:bg-slate-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs"
                        components={{
                          p: ({ children }) => <p className="my-1">{children}</p>,
                          strong: ({ children }) => <strong className="font-bold text-cyan-400">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-2 mb-1">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-bold mt-2 mb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>,
                        }}
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
                    theme === 'dark'
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-slate-100 border border-slate-200'
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
                <div className="relative">
                  <Button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    variant="ghost"
                    size="icon"
                    className={theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  
                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-[49]" onClick={() => setShowAttachMenu(false)} />
                      <div className={`absolute bottom-full left-0 mb-2 rounded-lg shadow-xl border z-50 ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                      }`}>
                        <button className={`flex items-center gap-2 px-4 py-2 hover:bg-slate-700 rounded-t-lg w-full text-left ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <Paperclip className="w-4 h-4" />
                          <span className="text-sm">Upload File</span>
                        </button>
                        <button className={`flex items-center gap-2 px-4 py-2 hover:bg-slate-700 rounded-b-lg w-full text-left ${
                          theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-sm">Upload Image</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
                
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask NOVUS anything..."
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}