
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Sparkles, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function NovusChatbotLanding({ theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addBotMessage("Hi! I'm Novus, your AI research collaborator. 👋\n\nWe're on a mission to accelerate cures for 400 million patients with rare diseases.");
        setTimeout(() => {
          addBotMessage("I can tell you about:\n• What OrphaNova does\n• Our mission and vision\n• How our platform works\n• Pricing and plans\n• Connect you with our makers\n\nWhat would you like to know?");
        }, 1500);
      }, 500);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        addBotMessage("Still here if you need me! Feel free to ask anything about OrphaNova. ✨");
      }, 45000);
    }
    return () => clearTimeout(idleTimerRef.current);
  }, [messages, isOpen]);

  const addBotMessage = (text) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { text, sender: 'bot' }]);
      setIsTyping(false);
    }, 800);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    
    const userMessage = inputValue.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setInputValue('');
    
    setTimeout(() => {
      handleBotResponse(userMessage.toLowerCase());
    }, 1000);
  };

  const handleBotResponse = (input) => {
    // Greeting patterns
    if (input.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)$/i)) {
      addBotMessage("Hello! Great to meet you! 👋\n\nI'm here to help you understand how OrphaNova is revolutionizing rare disease research.\n\nWhat would you like to explore?");
      return;
    }

    // About OrphaNova
    if (input.includes('what is') || input.includes('what\'s') || input.includes('orphanova') || input.includes('tell me about')) {
      addBotMessage("OrphaNova is an AI-powered research OS that unites human insight with AI to accelerate rare disease research.\n\nWe help researchers:\n• Find patterns across 8,000+ rare diseases\n• Generate hypotheses from multi-source data\n• Design experiments and clinical trials\n• Write grants automatically\n• Connect with collaborators worldwide\n\nAll in one unified workspace. Want to see how it works?");
      return;
    }

    // How it works / Features
    if (input.includes('how') || input.includes('work') || input.includes('feature') || input.includes('do') || input.includes('capabilities')) {
      addBotMessage("OrphaNova brings together everything a researcher needs:\n\n🔬 AI Literature Scoping - Instant summaries from PubMed, arXiv, ClinicalTrials.gov\n\n🧠 Hypothesis Generator - Novel research ideas from pattern recognition\n\n⚗️ Experimental Design - AI-powered study protocols\n\n💊 Drug Repurposing - Find existing drugs for new uses\n\n📝 Grant Writing - Auto-generated grant proposals\n\n🤝 Collaboration Hub - Connect with global researchers\n\nWant to try a demo or see pricing?");
      return;
    }

    // Mission / Why
    if (input.includes('mission') || input.includes('why') || input.includes('purpose') || input.includes('goal')) {
      addBotMessage("Our mission is powerful and personal:\n\n400 million people live with rare diseases. Most will never see a cure in their lifetime.\n\nWhy? Because research is too slow, too fragmented, too siloed.\n\nWe're changing that.\n\nBy uniting AI and human researchers, we're turning decades of scattered research into actionable discoveries.\n\nEvery breakthrough starts with someone who refused to accept 'incurable.' That's us. That's you. That's OrphaNova. 💙");
      return;
    }

    // About Novus
    if (input.includes('you') || input.includes('novus') || input.includes('who are you') || input.includes('what are you')) {
      addBotMessage("I'm Novus - your AI research collaborator. Think of me as your peer, reviewer, and brainstorming partner.\n\nI'm designed specifically for rare disease research. I help you:\n• Navigate massive datasets\n• Generate research hypotheses\n• Design experiments\n• Write compelling grants\n• Find collaborators\n\nTogether, humans and AI can uncover what neither could alone. 🚀\n\nWant to see me in action?");
      return;
    }

    // Pricing
    if (input.includes('pricing') || input.includes('cost') || input.includes('price') || input.includes('plan') || input.includes('how much')) {
      addBotMessage("We have flexible plans for every researcher:\n\n💚 Free - Perfect for students\n• 5 AI searches/month\n• Basic features\n\n⭐ OrphaNova Pro - $149/year (or $16/month)\n• Unlimited searches\n• Full AI features\n• Priority processing\n\n👥 Team/Labs - Custom pricing\n• Shared workspaces\n• Multi-user dashboards\n\n🏢 Enterprise - Custom pricing\n• Custom AI pipelines\n• On-prem deployment\n• Dedicated support\n\nWould you like to try it free or talk to our makers about custom solutions?");
      return;
    }

    // Demo / Try / See Plans
    if (input.includes('demo') || input.includes('try') || input.includes('test') || input.includes('show') || input.includes('see plan')) {
      addBotMessage("Excellent! I can connect you with our makers for a personalized demo.\n\nThey'll show you:\n✓ How OrphaNova fits your research\n✓ Real examples from your field\n✓ Custom features for your needs\n\nShall I open their calendar for you?");
      return;
    }

    // Connect / Talk / Meet
    if (input.includes('connect') || input.includes('talk') || input.includes('meet') || input.includes('contact') || input.includes('call') || input.includes('schedule') || input.includes('book')) {
      addBotMessage("Perfect! Let me connect you with our makers right now.\n\nThey're excited to show you how OrphaNova can accelerate your research. 🚀\n\nOpening the calendar...");
      setTimeout(() => {
        window.open('https://calendar.notion.so/meet/prashantsonibps/choose-the-date-and-time--thanks', '_blank');
      }, 1500);
      return;
    }

    // Research related
    if (input.includes('research') || input.includes('study') || input.includes('experiment') || input.includes('trial')) {
      addBotMessage("OrphaNova is built for researchers like you!\n\nWe understand research is hard:\n• Too many papers, not enough time\n• Scattered data across platforms\n• Complex experimental designs\n• Competitive grant funding\n\nOrphaNova solves all of this with AI.\n\nWhat's your research focus? I can tell you exactly how we can help.");
      return;
    }

    // Rare disease specific
    if (input.includes('rare disease') || input.includes('orphan') || input.includes('genetic') || input.includes('patient')) {
      addBotMessage("Rare diseases are exactly why we exist. 💙\n\n8,000+ rare diseases affect 400 million people globally.\n\nMost will never see a cure because:\n• Limited funding\n• Sparse patient data  \n• Fragmented research\n\nOrphaNova changes this by:\n✓ Connecting scattered research\n✓ Finding hidden patterns with AI\n✓ Enabling global collaboration\n✓ Accelerating drug repurposing\n\nEvery patient deserves a breakthrough. We're making it happen.\n\nWant to see how?");
      return;
    }

    // AI / Technology
    if (input.includes('ai') || input.includes('artificial intelligence') || input.includes('technology') || input.includes('algorithm')) {
      addBotMessage("Our AI is designed specifically for biomedical research:\n\n🧠 Built on advanced LLMs trained on scientific literature\n📊 Analyzes data from PubMed, ClinicalTrials.gov, DrugBank, and more\n🔍 Finds patterns humans might miss\n⚡ 10x faster than manual research\n\nBut here's the key: We don't replace researchers.\n\nWe empower them.\n\nAI + Human insight = Breakthrough discoveries. 🚀\n\nCurious about how it works for your research?");
      return;
    }

    // Collaboration
    if (input.includes('collab') || input.includes('team') || input.includes('partner') || input.includes('network')) {
      addBotMessage("Research breakthroughs happen through collaboration!\n\nOrphaNova's Collaboration Hub connects you with:\n• Researchers in your field\n• Complementary expertise\n• Shared datasets\n• Co-authoring opportunities\n\nNo more working in silos. Science moves faster together.\n\nInterested in joining our research network?");
      return;
    }

    // Thank you
    if (input.includes('thank') || input.includes('thanks') || input.includes('appreciate')) {
      addBotMessage("You're very welcome! 💙\n\nRemember: Together, we can turn decades into months.\n\nEvery question you ask brings us closer to cures for millions of patients.\n\nFeel free to explore more or connect with our makers anytime!");
      return;
    }

    // Goodbye
    if (input.includes('bye') || input.includes('goodbye') || input.includes('see you') || input.includes('later')) {
      addBotMessage("Thank you for exploring OrphaNova with me! 👋\n\nWhen you're ready to revolutionize your research, I'm here.\n\nUntil then - keep pushing boundaries! 🚀💙");
      return;
    }

    // Default fallback - offer specific help
    addBotMessage("Great question! I want to make sure I give you the best answer.\n\nI can help you with:\n• 🔬 What OrphaNova is and how it works\n• 🎯 Our mission for rare diseases\n• 💰 Pricing and plans\n• 🚀 Scheduling a personalized demo\n• 🤝 Connecting with our makers\n\nWhat would you like to explore?");
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 group cursor-pointer"
            onClick={() => setIsOpen(true)}
          >
            <div className="relative">
              {/* Main button with cleaner design */}
              <motion.div
                className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    "0 8px 30px rgba(99, 102, 241, 0.4)",
                    "0 8px 40px rgba(147, 51, 234, 0.5)",
                    "0 8px 30px rgba(99, 102, 241, 0.4)"
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                {/* Simple white icon */}
                <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white relative z-10" strokeWidth={2.5} />
                
                {/* Pulse effect */}
                <motion.div
                  className="absolute inset-0 bg-white/20 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              </motion.div>

              {/* Online indicator dot */}
              <motion.div
                className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-full border-2 border-white shadow-lg"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />

              {/* Tooltip - hide on mobile */}
              <motion.div
                className="hidden sm:block absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                initial={{ y: 10 }}
                animate={{ y: 0 }}
              >
                <div className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-xl">
                  Chat with Novus
                  <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[380px] h-[calc(100vh-2rem)] sm:h-[600px] max-h-[600px] z-50 flex flex-col rounded-3xl shadow-2xl overflow-hidden border ${
              isDark 
                ? 'bg-white border-slate-200'
                : 'bg-white border-slate-300'
            }`}
          >
            {/* Header with cleaner design */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Simpler logo circle */}
                <div className="relative">
                  <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      N
                    </span>
                  </div>
                  {/* Online dot on logo */}
                  <motion.div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg">Novus</h3>
                  <p className="text-xs text-white/90">AI Research Collaborator</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-5 space-y-4 ${
              isDark 
                ? 'bg-gradient-to-b from-slate-50 to-white'
                : 'bg-gradient-to-b from-slate-50 to-white'
            }`}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-md'
                    }`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2.5 h-2.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"
                          animate={{ y: [0, -10, 0] }}
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
              isDark ? 'border-slate-200 bg-white' : 'border-slate-300 bg-white'
            }`}>
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 border-slate-300 focus:border-purple-500 focus:ring-purple-500 rounded-xl"
                />
                <Button
                  onClick={handleSend}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl px-4 shadow-lg"
                  disabled={!inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Powered by <span className="font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Novus AI</span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
