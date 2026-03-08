import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, Sparkles, Eye } from 'lucide-react';

export default function HeroSection({ onSeePlans, onTryDemo, theme }) {
  const isDark = theme === 'dark';
  
  return (
    <div className="relative w-full px-4 sm:px-6 lg:px-8 text-center py-8 sm:py-0">
      <div className="max-w-7xl mx-auto">
        <Badge className={`mt-4 sm:mt-6 mb-6 sm:mb-8 px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-lg font-semibold rounded-full inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          isDark 
            ? 'bg-blue-600/20 text-blue-200 hover:bg-blue-600/30 border-blue-400/30'
            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300'
        }`}>
          <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Research Reimagined
        </Badge>
        
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 leading-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            OrphaNova
          </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-6 sm:mb-8 max-w-4xl mx-auto leading-relaxed px-2" style={{
            color: isDark ? '#dbeafe' : '#1e40af'
          }}>
            Accelerating Cures for Rare Diseases with AI
          </h2>
        </div>

        <p className="text-base sm:text-xl md:text-2xl mb-8 sm:mb-12 max-w-5xl mx-auto leading-relaxed px-2" style={{
          color: isDark ? '#cbd5e1' : '#475569'
        }}>
          OrphaNova unites AI and Researchers to uncover hidden patterns across 8,000+ Rare Diseases transforming decades of scattered research into actionable discoveries for 400M+ patients.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-stretch sm:items-center px-2">
          <Button
            onClick={onTryDemo}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-semibold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 w-full sm:w-auto">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            Book Personalised Demo
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2 sm:ml-3" />
          </Button>
          
          <Button
            onClick={onSeePlans}
            variant="outline"
            size="lg"
            className={`border-2 border-blue-400 px-8 sm:px-12 py-5 sm:py-6 text-lg sm:text-xl font-semibold rounded-xl backdrop-blur-sm w-full sm:w-auto ${
              isDark
                ? 'bg-blue-950/50 text-blue-100 hover:bg-blue-900/50'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}>
            <Eye className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            See Plans
          </Button>
        </div>
      </div>
    </div>
  );
}