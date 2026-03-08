import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Award, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../ThemeContext';

/**
 * Score Dashboard Visualization
 * Displays review scores in an interactive visual format
 */
export default function ScoreDashboard({ review }) {
  const { theme } = useTheme();

  const scores = [
    { 
      label: 'Novelty', 
      value: review.novelty_score || 0, 
      color: 'from-purple-500 to-pink-500',
      icon: Award
    },
    { 
      label: 'Plausibility', 
      value: review.plausibility_score || 0, 
      color: 'from-blue-500 to-cyan-500',
      icon: Target
    },
    { 
      label: 'Evidence', 
      value: review.evidence_strength || 0, 
      color: 'from-green-500 to-emerald-500',
      icon: CheckCircle2
    },
    { 
      label: 'Publication Ready', 
      value: review.publication_readiness || 0, 
      color: 'from-orange-500 to-yellow-500',
      icon: TrendingUp
    }
  ];

  const overallScore = review.acceptance_likelihood || 0;

  return (
    <div className="space-y-6">
      {/* Overall Score Gauge */}
      <div className="text-center">
        <div className="relative inline-block">
          <svg className="w-48 h-48 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="80"
              stroke={theme === 'dark' ? '#334155' : '#e2e8f0'}
              strokeWidth="12"
              fill="none"
            />
            {/* Progress circle */}
            <motion.circle
              cx="96"
              cy="96"
              r="80"
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 80}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
              animate={{ 
                strokeDashoffset: 2 * Math.PI * 80 * (1 - overallScore / 100) 
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className={`text-5xl font-bold ${
                overallScore >= 70 ? 'text-green-400' : 
                overallScore >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}
            >
              {Math.round(overallScore)}%
            </motion.div>
            <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Acceptance Likelihood
            </span>
          </div>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="grid grid-cols-2 gap-4">
        {scores.map((score, idx) => {
          const Icon = score.icon;
          return (
            <motion.div
              key={score.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-4 rounded-lg ${
                theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${score.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`font-medium ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {score.label}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className={`h-3 rounded-full overflow-hidden ${
                theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                <motion.div
                  className={`h-full bg-gradient-to-r ${score.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${score.value}%` }}
                  transition={{ duration: 1, delay: idx * 0.1 }}
                />
              </div>
              
              <div className="flex justify-between items-center mt-2">
                <span className={`text-2xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {Math.round(score.value)}
                </span>
                <span className={`text-xs ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  / 100
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Score Interpretation */}
      <div className={`p-4 rounded-lg ${
        overallScore >= 70 
          ? 'bg-green-500/20 border border-green-500/30' 
          : overallScore >= 50 
          ? 'bg-yellow-500/20 border border-yellow-500/30' 
          : 'bg-red-500/20 border border-red-500/30'
      }`}>
        <p className={`text-sm font-medium ${
          overallScore >= 70 ? 'text-green-300' : 
          overallScore >= 50 ? 'text-yellow-300' : 'text-red-300'
        }`}>
          {overallScore >= 70 
            ? '🎉 Excellent! Your research shows strong potential for publication.' 
            : overallScore >= 50 
            ? '⚠️ Good progress, but some areas need improvement before submission.' 
            : '📝 Significant work needed. Review the suggestions below carefully.'}
        </p>
      </div>
    </div>
  );
}