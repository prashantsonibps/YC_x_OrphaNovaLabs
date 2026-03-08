
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { IntegrationSuggestion } from '@/api/entities';
import { Lightbulb, Send, CheckCircle } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function SuggestionBox({ theme }) {
  const [email, setEmail] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  const isDark = theme === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!suggestion || !email) return;

    setIsSubmitting(true);
    try {
      await IntegrationSuggestion.create({ suggestion_text: suggestion, email });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setSuggestion('');
        setEmail('');
      }, 4000);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      ref={ref}
      className="py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          whileHover={{ scale: 1.1, rotate: 10 }}>

          <Lightbulb className="w-12 h-12 mx-auto text-yellow-400 mb-6" />
        </motion.div>

        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4"
          style={{ color: isDark ? '#ffffff' : '#0f172a' }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.2, duration: 0.8 }}>

          Help Us Build the Future?
        </motion.h2>

        <motion.p
          className="mb-8"
          style={{ color: isDark ? '#dbeafe' : '#64748b' }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.4, duration: 0.8 }}>

          Have an idea for a new feature or integration? Let us know!.
        </motion.p>
        
        {isSubmitted ?
        <motion.div
          className="backdrop-blur-sm border rounded-xl p-8 text-center"
          style={{
            backgroundColor: isDark ? 'rgba(5, 46, 22, 0.6)' : 'rgba(187, 247, 208, 0.6)',
            borderColor: isDark ? 'rgb(34, 197, 94)' : 'rgb(22, 163, 74)'
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}>

            <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}>

              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              Thank you for your suggestion!
            </h3>
            <p className="mt-2" style={{ color: isDark ? 'rgb(134, 239, 172)' : 'rgb(22, 101, 52)' }}>
              We'll review your idea and get in touch if it's approved.
            </p>
          </motion.div> :

        <motion.form
          onSubmit={handleSubmit}
          className="space-y-6 backdrop-blur-sm p-8 rounded-xl border"
          style={{
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
            borderColor: isDark ? 'rgb(71, 85, 105)' : 'rgb(226, 232, 240)'
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.6, duration: 0.8 }}>

            <Textarea
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            placeholder="I'd love to see an integration with..."
            className={`h-28 focus:border-blue-500 transition-colors ${
              isDark 
                ? 'bg-slate-900/70 border-slate-600 text-white placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500'
            }`}
            required />

            <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@university.edu"
            className={`focus:border-blue-500 transition-colors ${
              isDark 
                ? 'bg-slate-900/70 border-slate-600 text-white placeholder:text-slate-400'
                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500'
            }`}
            required />

            <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}>

              <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-lg shadow-xl text-white"
              disabled={isSubmitting}>

                {isSubmitting ? 'Submitting...' : <><Send className="w-5 h-5 mr-2" /> Submit Idea</>}
              </Button>
            </motion.div>
          </motion.form>
        }
        
        <motion.p className="text-sm text-blue-200 mt-6"

        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}>


        </motion.p>
      </div>
    </motion.div>);

}
