import React from 'react';
import { useTheme } from '../ThemeContext';

export default function Footer() {
  const { theme, getLogo } = useTheme();

  return (
    <footer className={`border-t mt-auto ${
    theme === 'dark' ?
    'bg-slate-900/50 border-slate-800' :
    'bg-white/50 border-slate-200'}`
    }>
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Tagline + Logo */}
          <div className="flex items-center gap-3">
            <img
              src={getLogo()}
              alt="OrphaNova"
              className="w-16 h-16 object-contain" />

            <div className="flex flex-col items-start gap-1">
              <span className="text-green-500 text-base font-medium">OrphaNova Inc.

              </span>
              <span className={`text-sm ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
              }>
                Built by researchers for 400M+ patients
              </span>
            </div>
          </div>

          {/* Center: Copyright + Powered by */}
          <div className="text-center">
            <p className={`text-sm ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`
            }>
              © 2025 OrphaNova Inc. All Rights Reserved
            </p>
            <p className={`text-xs mt-1 ${
            theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`
            }>
              Powered by <span className="text-blue-500 font-medium">NOVUS AI</span>
            </p>
          </div>

          {/* Right: Links */}
          <div className="flex items-center gap-4 text-sm">
            <a
              href="#"
              className={`transition-colors ${
              theme === 'dark' ?
              'text-slate-400 hover:text-white' :
              'text-slate-600 hover:text-slate-900'}`
              }>

              FAQs
            </a>
            <span className={theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}>|</span>
            <a
              href="#"
              className={`transition-colors ${
              theme === 'dark' ?
              'text-slate-400 hover:text-white' :
              'text-slate-600 hover:text-slate-900'}`
              }>

              Docs
            </a>
            <span className={theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}>|</span>
            <a
              href="#"
              className={`transition-colors ${
              theme === 'dark' ?
              'text-slate-400 hover:text-white' :
              'text-slate-600 hover:text-slate-900'}`
              }>

              About Us
            </a>
            <span className={theme === 'dark' ? 'text-slate-700' : 'text-slate-300'}>|</span>
            <a
              href="mailto:hello@orphanova.com"
              className={`transition-colors ${
              theme === 'dark' ?
              'text-slate-400 hover:text-white' :
              'text-slate-600 hover:text-slate-900'}`
              }>

              Contact Us
            </a>
          </div>
        </div>
      </div>
    </footer>);

}