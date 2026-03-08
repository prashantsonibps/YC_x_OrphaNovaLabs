import React from 'react';
import { Rocket, Database, FileText, Lightbulb, BrainCircuit, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  visible: {
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = (isOutput = false) => ({
  hidden: { opacity: 0, x: isOutput ? 20 : -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
});

export default function SolutionSection({ theme }) {
  const isDark = theme === 'dark';
  
  return (
    <section className={`py-24 ${isDark ? 'bg-transparent' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
        
          {/* Animated Visual */}
          <div className="relative h-80 md:h-96 flex justify-center items-center">
            <motion.div
              className="w-full h-full"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
            >
              {/* Inputs */}
              <motion.div variants={itemVariants()} className={`absolute top-[15%] left-[5%] flex items-center gap-3 p-3 backdrop-blur-sm rounded-lg shadow-md ${
                isDark ? 'bg-white/10 text-white border border-white/20' : 'bg-white/90 text-slate-900'
              }`}>
                <Database className="w-6 h-6 text-blue-500" /> <span className="font-medium">Raw Data</span>
              </motion.div>
              <motion.div variants={itemVariants()} className={`absolute top-[55%] left-[10%] flex items-center gap-3 p-3 backdrop-blur-sm rounded-lg shadow-md ${
                isDark ? 'bg-white/10 text-white border border-white/20' : 'bg-white/90 text-slate-900'
              }`}>
                <FileText className="w-6 h-6 text-red-500" /> <span className="font-medium">Papers & PDFs</span>
              </motion.div>

              {/* Central Hub */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
              >
                <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-2xl">
                    <img src="/logo.png" alt="OrphaNova Logo" className="w-20 h-20" />
                </div>
              </motion.div>
              
              {/* Animated Arrows */}
              <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 200">
                <motion.path
                  d="M 20 50 Q 70 60, 90 95"
                  fill="none" stroke="#60a5fa" strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "circOut", delay: 0.6 }}
                />
                <motion.path
                  d="M 30 130 Q 70 120, 90 105"
                  fill="none" stroke="#ef4444" strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "circOut", delay: 0.8 }}
                />
                <motion.path
                  d="M 110 95 Q 140 80, 180 60"
                  fill="none" stroke="#22c55e" strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "circOut", delay: 1.2 }}
                />
                 <motion.path
                  d="M 110 105 Q 140 120, 180 140"
                  fill="none" stroke="#f59e0b" strokeWidth="2"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: "circOut", delay: 1.4 }}
                />
              </svg>

              {/* Outputs */}
              <motion.div variants={itemVariants(true)} className={`absolute top-[20%] right-[0%] flex items-center gap-3 p-3 backdrop-blur-sm rounded-lg shadow-md ${
                isDark ? 'bg-white/10 text-white border border-white/20' : 'bg-white/90 text-slate-900'
              }`}>
                <Lightbulb className="w-6 h-6 text-green-500" /> <span className="font-medium">Actionable Insights</span>
              </motion.div>
              <motion.div variants={itemVariants(true)} className={`absolute top-[60%] right-[5%] flex items-center gap-3 p-3 backdrop-blur-sm rounded-lg shadow-md ${
                isDark ? 'bg-white/10 text-white border border-white/20' : 'bg-white/90 text-slate-900'
              }`}>
                <BrainCircuit className="w-6 h-6 text-amber-500" /> <span className="font-medium">New Hypotheses</span>
              </motion.div>

            </motion.div>
          </div>

          {/* Text Content */}
          <div className="text-center md:text-left">
            <div className={`inline-block p-4 rounded-2xl mb-6 ${
              isDark ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <Rocket className={`w-10 h-10 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              The Solution
            </h2>
            <div className={`text-lg max-w-xl mx-auto md:mx-0 space-y-6 leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                A single, AI-powered copilot that augments every step of the research lifecycle.
              </p>
              <p>
                OrphaNova unifies fragmented workflows into one intelligent platform. It automates the busywork, connects the dots across datasets, and surfaces insights that humans might miss.
              </p>
              <p className={`text-xl font-bold p-4 rounded-lg ${
                isDark ? 'text-blue-300 bg-blue-900/30' : 'text-blue-600 bg-blue-50'
              }`}>
                We're giving researchers what they've never had before:
                Speed, clarity, and collaboration — all in one AI-native research workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}