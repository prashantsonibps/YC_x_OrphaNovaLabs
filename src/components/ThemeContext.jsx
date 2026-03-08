import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage for saved theme, default to 'dark'
    if (typeof window !== 'undefined') {
      return localStorage.getItem('orphanova-theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    // Save theme to localStorage and apply to document
    localStorage.setItem('orphanova-theme', theme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getLogo = () => {
    return theme === 'dark'
      ? 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/0ee5cd7ea_image.png'
      : 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6914994ade0eb501881d7e25/978c810d4_OrphaNovaHealthcareStartupLogo4.png';
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, getLogo }}>
      {children}
    </ThemeContext.Provider>
  );
};