
import React from 'react';
import { Search, Brain, FlaskConical, Pill, FileText, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function FeaturesSection({ theme }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const isDark = theme === 'dark';

  const features = [
    {
      icon: Search,
      title: "AI Literature Scoping",
      description: "Summarizes and organizes research from PubMed, arXiv, and ClinicalTrials.gov with intelligent filtering and analysis.",
      gradient: "from-cyan-500 via-blue-500 to-indigo-500",
      shadowColor: "shadow-blue-500/25",
      bgGradient: "from-cyan-50 to-blue-50"
    },
    {
      icon: Brain,
      title: "AI Hypothesis Generator", 
      description: "Suggests novel research hypotheses based on multi-source data analysis and pattern recognition.",
      gradient: "from-purple-500 via-pink-500 to-rose-500",
      shadowColor: "shadow-purple-500/25",
      bgGradient: "from-purple-50 to-pink-50"
    },
    {
      icon: FlaskConical,
      title: "Experimental Design Assistant",
      description: "Proposes experimental setups, control groups, and sample sizes based on research objectives.",
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      shadowColor: "shadow-green-500/25",
      bgGradient: "from-emerald-50 to-teal-50"
    },
    {
      icon: Pill,
      title: "Drug Repurposing Pipeline",
      description: "Identifies potential drug candidates for new indications using AI-powered molecular analysis.",
      gradient: "from-orange-500 via-red-500 to-pink-500",
      shadowColor: "shadow-orange-500/25",
      bgGradient: "from-orange-50 to-red-50"
    },
    {
      icon: FileText,
      title: "Automatic Grant Writing",
      description: "Generates grant drafts based on research goals with proper formatting and compelling narratives.",
      gradient: "from-indigo-500 via-purple-500 to-blue-500",
      shadowColor: "shadow-indigo-500/25",
      bgGradient: "from-indigo-50 to-purple-50"
    },
    {
      icon: Users,
      title: "Collaboration Marketplace",
      description: "Connects researchers with potential collaborators based on expertise and research interests.",
      gradient: "from-teal-500 via-cyan-500 to-blue-500",
      shadowColor: "shadow-teal-500/25",
      bgGradient: "from-teal-50 to-cyan-50"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 60,
      rotateY: -15
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <motion.section 
      ref={ref}
      className="py-12 sm:py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 px-2"
            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Powerful AI Tools for Every Research Stage
          </motion.h2>
          <motion.p 
            className="text-base sm:text-xl max-w-3xl mx-auto leading-relaxed px-2"
            style={{ color: isDark ? '#dbeafe' : '#64748b' }}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            From initial literature review to grant submission, OrphaNova provides AI-powered assistance 
            at every stage of your research journey.
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                rotateY: 5,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={`backdrop-blur-md border-2 hover:${feature.shadowColor} hover:shadow-2xl transition-all duration-700 h-full group overflow-hidden ${
                isDark 
                  ? 'bg-white/10 border-white/20'
                  : 'bg-white/90 border-slate-200'
              }`}>
                <CardContent className="p-8 relative">
                  <motion.div 
                    className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 ${feature.shadowColor} shadow-xl`}
                    whileHover={{ 
                      scale: 1.15, 
                      rotate: 10,
                      transition: { type: "spring", stiffness: 400, damping: 15 }
                    }}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-4 text-center group-hover:text-blue-600 transition-colors"
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {feature.title}
                  </h3>
                  <p className="leading-relaxed text-center"
                  style={{ color: isDark ? '#dbeafe' : '#64748b' }}>
                    {feature.description}
                  </p>
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
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
