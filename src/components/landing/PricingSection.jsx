
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export default function PricingSection({ onTryFree, onBookCall, theme }) {
  const [billingPeriod, setBillingPeriod] = useState('annually');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isDark = theme === 'dark';

  const plans = [
    {
      name: 'Free',
      description: 'For individuals and students exploring rare disease research with AI.',
      price: { monthly: '$0', annually: '$0' },
      priceDetail: { monthly: null, annually: null },
      popular: false,
      buttonText: 'Try for Free',
      buttonAction: onTryFree,
      features: [
        '5 AI-assisted searches per month',
        'Literature review summaries',
        'Basic hypothesis generation',
        'Personal dashboard',
        'Export basic reports'
      ]
    },
    {
      name: 'OrphaNova Pro',
      description: 'For researchers accelerating their projects with full access to Novus AI.',
      price: { monthly: '$16', annually: '$12' },
      priceDetail: { 
        monthly: '/month', 
        annually: '/month'
      },
      billedAs: {
        monthly: null,
        annually: 'Billed annually at $149'
      },
      savings: {
        monthly: null,
        annually: 'Save $43/year vs monthly'
      },
      popular: true,
      buttonText: 'Try for Free',
      buttonAction: onTryFree,
      features: [
        'Unlimited literature searches',
        'Full-text analysis & hypothesis generation',
        'Dataset upload and insight extraction',
        'Saved projects and workflow history',
        'Priority processing and updates'
      ]
    },
    {
      name: 'Team / Labs',
      description: 'For academic labs and research teams collaborating on rare disease discovery.',
      price: { monthly: 'Custom', annually: 'Custom' },
      priceDetail: { monthly: null, annually: null },
      popular: false,
      buttonText: 'Book a Call',
      buttonAction: onBookCall,
      features: [
        'Shared workspace & collaboration tools',
        'Multi-user dashboards',
        'Hypothesis ranking & validation reports',
        'Reproducible workflows',
        'Priority team support'
      ]
    },
    {
      name: 'Enterprise',
      description: 'For biotech, pharma, and institutional partners driving large-scale research.',
      price: { monthly: 'Custom', annually: 'Custom' },
      priceDetail: { monthly: null, annually: null },
      popular: false,
      buttonText: 'Book a Call',
      buttonAction: onBookCall,
      features: [
        'Custom AI pipelines and integrations',
        'Secure cloud or on-prem deployment',
        'Unlimited users & datasets',
        'Compliance, audit logs, and SLAs',
        'Dedicated enterprise support'
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
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
      className="py-12 sm:py-24 bg-transparent relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0">
        <motion.div 
          className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-blue-400/10' : 'bg-blue-300/8'
          }`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className={`absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl ${
            isDark ? 'bg-purple-400/10' : 'bg-purple-300/8'
          }`}
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h2 
            className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 px-2"
            style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Plans
          </motion.h2>
          <motion.p 
            className="text-base sm:text-xl max-w-3xl mx-auto mb-6 sm:mb-8 px-2"
            style={{ color: isDark ? '#dbeafe' : '#64748b' }}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Flexible plans built for every stage of discovery
          </motion.p>
          <motion.p 
            className="text-sm sm:text-lg max-w-2xl mx-auto px-2"
            style={{ color: isDark ? '#cbd5e1' : '#64748b' }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            From solo researchers to biotech teams — start free, scale with your science.
          </motion.p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div 
          className="flex justify-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className={`backdrop-blur-md p-1.5 rounded-xl border flex gap-1 ${
            isDark 
              ? 'bg-slate-800/60 border-slate-600'
              : 'bg-white/60 border-slate-300'
          }`}>
            <button
              onClick={() => setBillingPeriod('annually')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                billingPeriod === 'annually'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annually
            </button>
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                billingPeriod === 'monthly'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                y: -8,
                transition: { type: "spring", stiffness: 300, damping: 20 }
              }}
            >
              <Card 
                className={`relative backdrop-blur-md border-2 h-full flex flex-col ${
                  plan.popular 
                    ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' 
                    : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-300 hover:border-slate-400'
                } ${
                  isDark ? 'bg-slate-800/60' : 'bg-white/80'
                } transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1 text-sm font-bold shadow-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      POPULAR
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    {plan.name}
                  </CardTitle>
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                        {plan.price[billingPeriod]}
                      </span>
                      {plan.priceDetail && plan.priceDetail[billingPeriod] && (
                        <span className="text-lg font-normal" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
                          {plan.priceDetail[billingPeriod]}
                        </span>
                      )}
                    </div>
                    {plan.billedAs && plan.billedAs[billingPeriod] && (
                      <div className="text-xs mt-1" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
                        {plan.billedAs[billingPeriod]}
                      </div>
                    )}
                    {plan.savings && plan.savings[billingPeriod] && (
                      <div className="mt-2">
                        <Badge className="bg-green-600/20 text-green-400 border-green-500/30">
                          {plan.savings[billingPeriod]}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
                    {plan.description}
                  </p>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm" style={{ color: isDark ? '#e2e8f0' : '#475569' }}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={plan.buttonAction}
                    className={`w-full ${
                      plan.popular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        : 'bg-slate-700 hover:bg-slate-600 text-white'
                    } py-6 text-lg font-semibold`}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Tagline */}
        <motion.div 
          className="mt-12 sm:mt-16 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <p className="text-sm sm:text-lg px-2" style={{ color: isDark ? '#cbd5e1' : '#64748b' }}>
            Powered by <span className="text-blue-400 font-semibold">Novus AI</span> — secure, research-grade, and built to uncover cures across{' '}
            <span className={isDark ? 'text-white font-semibold' : 'text-slate-900 font-semibold'}>8,000+ rare diseases</span>.
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
