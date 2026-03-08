import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Crown, Moon, Sun, Github, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SettingsModal({ user, onClose }) {
  const [theme, setTheme] = useState('dark');

  const plans = {
    free: { name: 'Free', color: 'slate' },
    student: { name: 'Student', color: 'blue' },
    advanced: { name: 'Advanced', color: 'purple' },
    enterprise: { name: 'Enterprise', color: 'gold' }
  };

  const currentPlan = user?.plan || 'free';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </h3>
            <div className="space-y-4 bg-slate-800/50 p-4 rounded-lg">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Full Name</label>
                <Input
                  value={user?.full_name || ''}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Email</label>
                <Input
                  value={user?.email || ''}
                  className="bg-slate-900 border-slate-700 text-white"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Plan Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Current Plan
            </h3>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-white">{plans[currentPlan].name}</p>
                  <p className="text-sm text-slate-400">Active subscription</p>
                </div>
                <div className={`px-4 py-2 bg-${plans[currentPlan].color}-500/20 border border-${plans[currentPlan].color}-500/50 rounded-lg`}>
                  <p className={`text-sm font-semibold text-${plans[currentPlan].color}-400`}>
                    {currentPlan === 'free' ? '$0/mo' : 'Custom'}
                  </p>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
                Upgrade Plan
              </Button>
            </div>
          </div>

          {/* Theme Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Theme
            </h3>
            <div className="flex gap-3 bg-slate-800/50 p-2 rounded-lg">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm">Dark</p>
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                  theme === 'light'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm">Light</p>
              </button>
            </div>
          </div>

          {/* Integrations */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Integrations</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-white font-medium">GitHub</p>
                    <p className="text-xs text-slate-400">Sync your research code</p>
                  </div>
                </div>
                <span className="text-xs text-slate-500 bg-slate-700 px-3 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
            <Button className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Export All Data (JSON)
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}