import React from 'react';
import { Puzzle, FileSearch, Table, FileText, MessageSquare, FileSignature, Database } from 'lucide-react';
import { motion } from 'framer-motion';

const tools = [
  { name: 'PubMed', icon: FileSearch, color: 'bg-blue-100 text-blue-700', position: { top: '5%', left: '10%' } },
  { name: 'Spreadsheets', icon: Table, color: 'bg-green-100 text-green-700', position: { top: '30%', left: '60%' } },
  { name: 'PDFs', icon: FileText, color: 'bg-red-100 text-red-700', position: { top: '55%', left: '5%' } },
  { name: 'ChatGPT', icon: MessageSquare, color: 'bg-teal-100 text-teal-700', position: { top: '10%', left: '70%' } },
  { name: 'Word Docs', icon: FileSignature, color: 'bg-sky-100 text-sky-700', position: { top: '65%', left: '50%' } },
  { name: 'Databases', icon: Database, color: 'bg-yellow-100 text-yellow-700', position: { top: '30%', left: '0%' } },
];

const cardVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: i => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.2,
      type: 'spring',
      stiffness: 150,
      damping: 20
    },
  }),
};

export default function ChallengeSection({ theme }) {
  const isDark = theme === 'dark';
  
  return (
    <section className={`py-24 ${isDark ? 'bg-transparent' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          
          {/* Text Content */}
          <div className="text-center md:text-left">
            <div className={`inline-block p-4 rounded-2xl mb-6 ${
              isDark ? 'bg-red-500/20' : 'bg-red-100'
            }`}>
              <Puzzle className={`w-10 h-10 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            </div>
            <h2 className={`text-4xl md:text-5xl font-bold mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              The Challenge
            </h2>
            <div className={`text-lg max-w-xl mx-auto md:mx-0 space-y-6 leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}>
              <p>
                Biomedical research is painfully slow, expensive, and deeply fragmented.
              </p>
              <p>
                Researchers spend up to 50% of their time on manual, repetitive tasks — scouring literature, compiling data, and drafting grants — instead of focusing on real discovery.
                Meanwhile, critical knowledge is siloed across disconnected tools, databases, and institutions.
              </p>
              <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>
                This slows progress dramatically — especially for rare diseases, where time and funding are already limited.
              </p>
            </div>
          </div>
          
          {/* Animated Visual */}
          <div className="relative h-80 md:h-96 -mx-4 md:mx-0">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.name}
                className={`absolute p-4 rounded-xl shadow-lg flex items-center gap-3 ${tool.color} border-2 border-white/50`}
                style={tool.position}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.5 }}
                custom={i}
                animate={{
                  y: [0, -8, 0, 5, 0],
                  x: [0, 4, -3, 0, 4],
                }}
                transition={{
                  duration: 8,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: i * 0.5,
                }}
              >
                <tool.icon className="w-6 h-6 flex-shrink-0" />
                <span className="font-semibold text-lg">{tool.name}</span>
              </motion.div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
          </div>
        </div>
      </div>
    </section>
  );
}