import React from 'react';
import { motion } from 'framer-motion';
import { Check, Lock, ChevronLeft } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export default function Sidebar({ stages, currentStage, stageStatus, onStageClick, isOpen, onToggle }) {
  const { theme, getLogo } = useTheme();
  return (
    <motion.div
      initial={false}
      animate={{ 
        width: isOpen ? 280 : 64,
      }}
      transition={{ 
        type: 'spring', 
        damping: 30, 
        stiffness: 300,
        mass: 0.8
      }}
      onClick={!isOpen ? onToggle : undefined}
      className={`backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden transition-colors cursor-pointer ${
        theme === 'dark'
          ? 'bg-slate-900/80 border border-slate-700/50 hover:border-slate-600/50'
          : 'bg-white/80 border border-slate-200/50 hover:border-slate-300/50'
      }`}
    >
      {isOpen ? (
        <>
          {/* Header */}
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-slate-700/50' : 'border-slate-200/50'
          }`}>
            <div className="flex items-center gap-3">
              <img 
                src={getLogo()}
                alt="OrphaNova Labs"
                className="w-8 h-8 object-contain"
              />
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className={`font-bold text-sm whitespace-nowrap ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Workflow</h2>
              </motion.div>
            </div>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={onToggle}
              className={`transition-colors ${
                theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Stage Navigator */}
          <motion.div 
            className="p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            <div className="space-y-2">
              {stages.map((stage) => {
                const isActive = currentStage === stage.id;
                const isCompleted = stageStatus?.[stage.id] === 'completed';
                const isLocked = stageStatus?.[stage.id] === 'locked';
                const Icon = stage.icon;

                return (
                  <motion.button
                    key={stage.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isLocked) onStageClick(stage.id);
                    }}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/50'
                        : isCompleted
                        ? `border border-green-500/30 ${
                            theme === 'dark' 
                              ? 'bg-slate-800/50 text-slate-300 hover:bg-slate-800' 
                              : 'bg-slate-100/50 text-slate-700 hover:bg-slate-100'
                          }`
                        : isLocked
                        ? `border cursor-not-allowed ${
                            theme === 'dark'
                              ? 'bg-slate-800/20 border-slate-700/30 text-slate-600'
                              : 'bg-slate-100/20 border-slate-300/30 text-slate-400'
                          }`
                        : `border ${
                            theme === 'dark'
                              ? 'bg-slate-800/50 border-slate-700/30 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                              : 'bg-slate-100/50 border-slate-200/30 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          }`
                    } ${isActive ? (theme === 'dark' ? 'text-white' : 'text-blue-700') : ''}`}
                    whileHover={!isLocked ? { scale: 1.02, x: 4 } : {}}
                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : isLocked
                        ? `${theme === 'dark' ? 'bg-slate-700 text-slate-500' : 'bg-slate-300 text-slate-400'}`
                        : `${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-300 text-slate-600'}`
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium whitespace-nowrap">{stage.name}</p>
                      <p className="text-xs opacity-70 whitespace-nowrap">
                        {isCompleted ? 'Completed' : isActive ? 'In Progress' : isLocked ? 'Locked' : 'Ready'}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      ) : (
        <div className="flex flex-col items-center py-6 gap-4">
          {/* Logo */}
          <motion.img 
            src={getLogo()}
            alt="OrphaNova Labs"
            className="w-10 h-10 object-contain"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          />

          {/* Vertical Stage Indicators */}
          <motion.div 
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {stages.map((stage) => {
              const isActive = currentStage === stage.id;
              const isCompleted = stageStatus?.[stage.id] === 'completed';
              const isLocked = stageStatus?.[stage.id] === 'locked';
              const Icon = stage.icon;

              return (
                <div
                  key={stage.id}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : isLocked
                      ? `${theme === 'dark' ? 'bg-slate-800/50 text-slate-600' : 'bg-slate-200/50 text-slate-400'}`
                      : `${theme === 'dark' ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-200/50 text-slate-600'}`
                  }`}
                  title={stage.name}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}