import React from 'react';
import { motion } from 'framer-motion';

export default function WelcomeAnimation() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center overflow-hidden">
      {/* Animated DNA Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-950 to-blue-950"></div>
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: 0,
              opacity: 0
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 0.8, 0],
              y: [
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight,
                Math.random() * window.innerHeight
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.02
            }}
          />
        ))}
      </div>

      {/* Welcome Text */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="mb-6"
          animate={{
            rotateY: [0, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-24 h-24 mx-auto bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl p-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/978c810d4_OrphaNovaHealthcareStartupLogo4.png"
              alt="OrphaNova Labs"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        <motion.h1
          className="text-5xl font-bold text-white mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Welcome to OrphaNova Labs
        </motion.h1>

        <motion.p
          className="text-xl text-blue-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Your AI-powered research companion
        </motion.p>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto rounded-full"></div>
        </motion.div>
      </motion.div>
    </div>
  );
}