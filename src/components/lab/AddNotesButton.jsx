import React from 'react';
import { motion } from 'framer-motion';
import { Paperclip } from 'lucide-react';
import { useTheme } from '../ThemeContext';

/**
 * Floating Add Notes Button
 * Appears in bottom-right corner of each stage
 */
export default function AddNotesButton({ onClick }) {
  const { theme } = useTheme();

  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={`fixed bottom-24 right-8 z-30 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-colors ${
        theme === 'dark'
          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
          : 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600'
      }`}
      title="Add Notes"
    >
      <Paperclip className="w-6 h-6 text-white" />
    </motion.button>
  );
}