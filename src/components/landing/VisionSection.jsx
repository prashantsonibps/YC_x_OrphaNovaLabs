import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function VisionSection({ onJoinWaitlist, theme }) {
  const isDark = theme === 'dark';
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
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
      className="py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl"
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2
          }}
          whileHover={{
            scale: 1.1,
            rotate: 10,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
          }}>

          <Lightbulb className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h2 
          className={`mb-8 text-4xl font-bold md:text-5xl leading-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Our Vision: A Future Of Accelerated Discovery
        </motion.h2>
        
        <motion.p 
          className={`mb-12 text-lg leading-relaxed ${
            isDark ? 'text-blue-100' : 'text-slate-600'
          }`}

        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ delay: 0.6, duration: 0.8 }}>We believe that the future of medicine will be built by humans and AI working in partnership. Our mission is to build the foundational operating system for this new era of biomedical research, enabling scientists to cure diseases faster than ever thought possible.



        </motion.p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
                delayChildren: 0.8
              }
            }
          }}>

          <motion.div
            className="text-center group cursor-pointer"
            variants={statsVariants}
            whileHover={{ scale: 1.05 }}>

            <motion.div
              className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent"
              animate={isInView ? {
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}>

              Years → Months
            </motion.div>
            <div className={`group-hover:text-white transition-colors ${
              isDark ? 'text-blue-200' : 'text-slate-600'
            }`}>Research Timeline</div>
          </motion.div>
          <motion.div
            className="text-center group cursor-pointer"
            variants={statsVariants}
            whileHover={{ scale: 1.05 }}>

            <motion.div
              className={`text-3xl font-bold mb-2 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent ${
                isDark ? 'text-white' : ''
              }`}
              animate={isInView ? {
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}>

              Global Impact
            </motion.div>
            <div className={`group-hover:text-white transition-colors ${
              isDark ? 'text-blue-200' : 'text-slate-600'
            }`}>Worldwide Collaboration</div>
          </motion.div>
          <motion.div
            className="text-center group cursor-pointer"
            variants={statsVariants}
            whileHover={{ scale: 1.05 }}>

            <motion.div
              className={`text-3xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent ${
                isDark ? 'text-white' : ''
              }`}
              animate={isInView ? {
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1
              }}>

              Breakthrough
            </motion.div>
            <div className={`group-hover:text-white transition-colors ${
              isDark ? 'text-blue-200' : 'text-slate-600'
            }`}>Discoveries</div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
          transition={{ delay: 1.2, duration: 0.8 }}>

          <Button
            size="lg"
            onClick={onJoinWaitlist}
            className={`px-12 py-6 text-xl font-semibold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 group ${
              isDark ? 'bg-white text-slate-900 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}>

            Join the Revolution
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}>

              <ArrowRight className="w-6 h-6 ml-3" />
            </motion.div>
          </Button>
        </motion.div>
      </div>
    </motion.section>);

}