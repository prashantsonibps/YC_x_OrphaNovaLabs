import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5 }}
      className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40"
    >
      <Button
        onClick={onToggle}
        variant="outline"
        size="icon"
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-lg backdrop-blur-md transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-slate-800/80 border-slate-600 text-yellow-400 hover:bg-slate-700/80'
            : 'bg-white/80 border-slate-300 text-slate-700 hover:bg-slate-50/80'
        }`}
      >
        <motion.div
          initial={false}
          animate={{ rotate: theme === 'dark' ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
        </motion.div>
      </Button>
    </motion.div>
  );
}