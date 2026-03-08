import React from 'react';
import { Clock, Puzzle, Turtle, Users, Layers, Laptop, FileLock, Target, HeartPulse } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function ProblemSection({ theme }) {
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const problems = [
    {
      icon: Clock,
      title: "Time-Intensive, Manual Work",
      description: "Researchers spend up to 70% of their time on repetitive tasks — literature reviews, formatting citations, pulling data — instead of advancing discovery.",
      gradient: "from-red-500 via-pink-500 to-rose-500",
      bgGradient: "from-red-50 to-pink-50"
    },
    {
      icon: Puzzle,
      title: "Fragmented Information Sources",
      description: "Key data is scattered across thousands of disconnected databases — PubMed, DrugBank, ClinicalTrials.gov, arXiv — with no unified lens.",
      gradient: "from-orange-500 via-amber-500 to-yellow-500",
      bgGradient: "from-orange-50 to-amber-50"
    },
    {
      icon: Turtle,
      title: "Painfully Slow Clinical Translation",
      description: "It takes an average of 17 years for basic research to turn into clinical treatments — often too late for patients with rare diseases.",
      gradient: "from-green-500 via-emerald-500 to-teal-500",
      bgGradient: "from-green-50 to-emerald-50"
    },
    {
      icon: Users,
      title: "Siloed Collaboration",
      description: "Scientists often work in isolation, missing critical opportunities to collaborate, co-author, or validate hypotheses across institutions.",
      gradient: "from-blue-500 via-indigo-500 to-cyan-500",
      bgGradient: "from-blue-50 to-indigo-50"
    },
    {
      icon: Layers,
      title: "Information Overload, Not Intelligence",
      description: "There are too many papers, not enough insight — over 1 million biomedical papers published yearly, most unread, unstructured, and underused.",
      gradient: "from-purple-500 via-violet-500 to-indigo-500",
      bgGradient: "from-purple-50 to-violet-50"
    },
    {
      icon: Laptop,
      title: "Outdated Tools for a Modern Workflow",
      description: "Most research tools are single-purpose, designed decades ago, and lack AI capabilities or integration — forcing researchers to juggle 10+ platforms.",
      gradient: "from-pink-500 via-rose-500 to-red-500",
      bgGradient: "from-pink-50 to-rose-50"
    },
    {
      icon: FileLock,
      title: "Grant Bottlenecks and Bureaucracy",
      description: "Writing grants is time-consuming, repetitive, and competitive, with success rates below 20% — draining time from actual research.",
      gradient: "from-amber-500 via-yellow-500 to-orange-500",
      bgGradient: "from-amber-50 to-yellow-50"
    },
    {
      icon: Target,
      title: "Trial Design is Guesswork",
      description: "Designing experiments and clinical trials often relies on intuition and past experience, rather than data-driven design support.",
      gradient: "from-emerald-500 via-teal-500 to-cyan-500",
      bgGradient: "from-emerald-50 to-teal-50"
    },
    {
      icon: HeartPulse,
      title: "Rare Diseases Are Understudied",
      description: "With fewer resources, rare disease research suffers the most from fragmented knowledge and lack of funding — slowing critical breakthroughs.",
      gradient: "from-violet-500 via-purple-500 to-pink-500",
      bgGradient: "from-violet-50 to-purple-50"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <motion.section 
      ref={ref}
      className={`py-24 relative overflow-hidden ${
        isDark ? 'bg-transparent' : 'bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50'
      }`}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Enhanced Background Pattern */}
      <div className="absolute inset-0">
        <motion.div 
          className="absolute top-0 left-0 w-full h-full opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 80%, rgba(239, 68, 68, 0.1) 0%, transparent 40%), 
                             radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 40%),
                             radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)`
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className={`text-5xl md:text-6xl font-bold mb-6 ${
              isDark 
                ? 'text-white' 
                : 'bg-gradient-to-r from-slate-900 via-red-700 to-orange-600 bg-clip-text text-transparent'
            }`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            The Problem with Modern Research
          </motion.h2>
          <motion.p 
            className={`text-xl max-w-3xl mx-auto leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Biomedical research is held back by outdated tools and fragmented workflows.
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`border-2 hover:shadow-2xl transition-all duration-500 h-full overflow-hidden group backdrop-blur-sm ${
                isDark 
                  ? 'bg-white/10 border-white/20' 
                  : `bg-gradient-to-br ${problem.bgGradient} border-white/60`
              }`}>
                <CardContent className="p-8 relative">
                  <motion.div 
                    className={`w-16 h-16 bg-gradient-to-br ${problem.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <problem.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className={`text-xl font-bold mb-4 text-center transition-colors ${
                    isDark ? 'text-white' : 'text-slate-900 group-hover:text-slate-800'
                  }`}>
                    {problem.title}
                  </h3>
                  <p className={`leading-relaxed text-center text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {problem.description}
                  </p>
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${problem.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                  />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}