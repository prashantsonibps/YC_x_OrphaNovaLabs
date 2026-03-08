import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const challenges = [
{
  emoji: "⏳",
  title: "Wasted Time",
  description: "Half a researcher's week disappears into manual drudgery instead of discovery."
},
{
  emoji: "🔗",
  title: "Scattered Data",
  description: "Critical findings are split across 10+ platforms that don't talk to each other."
},
{
  emoji: "🐢",
  title: "Slow Translation",
  description: "On an Average It takes ~17 years for breakthroughs to reach the clinic."
},
{
  emoji: "🧬",
  title: "Rare Diseases Left Behind",
  description: "Sparse data and limited funding mean treatments never make it to patients."
}];

export default function ChallengeSolutionSection({ theme }) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const isDark = theme === 'dark';

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

  const itemVariants = {
    hidden: {
      opacity: 0,
      x: -30
    },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const imageVariants = {
    hidden: {
      opacity: 0,
      x: 30,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 15,
        delay: 0.5
      }
    }
  };

  return (
    <motion.section
      ref={sectionRef}
      className="py-12 sm:py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, delay: 0.1 }}>

          <motion.h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 sm:mb-6 px-2"
          style={{ color: isDark ? '#ffffff' : '#0f172a' }}
          initial={{ opacity: 0, x: -30 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
          transition={{ delay: 0.3, duration: 0.8 }}>
            In the age of AI, biomedical research still crawls at human speed.
          </motion.h2>
          <motion.p className="text-base sm:text-lg max-w-3xl mx-auto px-2"
          style={{ color: isDark ? '#dbeafe' : '#475569' }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}>
            Researchers burn days jumping between 10+ tools that don't talk to each other, and critical insights slip through the cracks.
          </motion.p>
        </motion.div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
          {/* Left Side - Bullet Points */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="space-y-4 sm:space-y-6 order-2 lg:order-1">

            {challenges.map((challenge, index) =>
            <motion.div
              key={index}
              variants={itemVariants}
              className="flex items-start gap-3 sm:gap-4 group">

                <div className="text-2xl sm:text-3xl flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                  {challenge.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold mb-1 sm:mb-2 group-hover:text-blue-500 transition-colors duration-200"
                  style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {challenge.title}
                  </h3>
                  <p className="text-sm sm:text-base leading-relaxed"
                  style={{ color: isDark ? '#dbeafe' : '#64748b' }}>
                    {challenge.description}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Side - Image */}
          <motion.div
            variants={imageVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="relative order-1 lg:order-2">

            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6bdd314db_ChatGPTImageAug9202509_06_56PM.png"
              alt="Overwhelmed researcher dealing with fragmented data sources"
              className="w-full h-auto drop-shadow-2xl rounded-xl" />

          </motion.div>
        </div>
      </div>
    </motion.section>);

}