import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTheme } from '../ThemeContext';

const STAGE_INFO = {
  0: {
    name: 'Upload & Context',
    completedActions: [
      'Disease information collected',
      'Context files uploaded',
      'AI analysis completed'
    ],
    nextName: 'Literature Retrieval',
    nextActions: [
      'Search scientific databases (PubMed, Orphanet)',
      'Parse and rank relevant papers',
      'Extract key entities and topics'
    ]
  },
  1: {
    name: 'Literature Retrieval',
    completedActions: [
      'Searched multiple databases',
      'Found relevant publications',
      'Selected papers for analysis'
    ],
    nextName: 'Evidence Extraction',
    nextActions: [
      'Extract disease-gene-drug relationships',
      'Analyze molecular pathways',
      'Build knowledge graph'
    ]
  },
  2: {
    name: 'Evidence Extraction',
    completedActions: [
      'Extracted biological relationships',
      'Validated evidence with confidence scores',
      'Built knowledge database'
    ],
    nextName: 'Hypothesis Generation',
    nextActions: [
      'Generate research hypotheses',
      'Calculate confidence scores',
      'Provide supporting citations'
    ]
  },
  3: {
    name: 'Hypothesis Generation',
    completedActions: [
      'Generated novel hypotheses',
      'Reviewed and edited suggestions',
      'Approved promising directions'
    ],
    nextName: 'Experiment Suggestions',
    nextActions: [
      'Suggest experimental protocols',
      'Estimate feasibility and impact',
      'Provide methodology details'
    ]
  },
  4: {
    name: 'Experiment Suggestions',
    completedActions: [
      'Generated experiment protocols',
      'Rated feasibility and impact',
      'Selected promising experiments'
    ],
    nextName: 'Review & Scoring',
    nextActions: [
      'Comprehensive project review',
      'Score novelty and plausibility',
      'Provide improvement suggestions'
    ]
  },
  5: {
    name: 'Review & Scoring',
    completedActions: [
      'Completed comprehensive review',
      'Analyzed all metrics',
      'Received improvement suggestions'
    ],
    nextName: 'Paper Drafting',
    nextActions: [
      'Generate paper draft',
      'Format for target publication',
      'Create figures and references'
    ]
  }
};

export default function StageTransition({ currentStage, onStart, onSkip, customCompletedActions, customNextActions }) {
  const { theme } = useTheme();
  const info = STAGE_INFO[currentStage - 1];

  if (!info || currentStage === 0) return null;

  const completedActions = customCompletedActions || info.completedActions;
  const nextActions = customNextActions || info.nextActions;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        className="w-full max-w-3xl"
      >
        <Card className={`${
          theme === 'dark' 
            ? 'bg-slate-900 border-slate-700' 
            : 'bg-white border-slate-200'
        } shadow-2xl`}>
          <CardContent className="p-8">
            {/* Completion Badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-3 px-6 py-3 bg-green-500/20 border border-green-500/30 rounded-full">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-semibold text-lg">
                  Stage {currentStage}: {info.name} Complete
                </span>
              </div>
            </div>

            {/* What We Did */}
            <div className="mb-8">
              <h3 className={`text-xl font-bold mb-4 ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}>
                ✅ What We Did:
              </h3>
              <div className="space-y-2">
                {completedActions.map((action, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-slate-800/50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                      {action}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className={`border-t my-6 ${
              theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
            }`} />

            {/* What's Next */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-cyan-400" />
                <h3 className={`text-xl font-bold ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  Next: {info.nextName}
                </h3>
              </div>
              <p className={`mb-4 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                What We'll Do:
              </p>
              <div className="space-y-2">
                {nextActions.map((action, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                    }`}
                  >
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                    <span className={theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}>
                      {action}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                onClick={onStart}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-lg py-6"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start {info.nextName}
              </Button>
              <Button
                onClick={onSkip}
                variant="outline"
                className={`${
                  theme === 'dark' 
                    ? 'border-slate-700 text-slate-400 hover:bg-slate-800' 
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Skip Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}