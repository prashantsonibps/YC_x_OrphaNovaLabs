import React, { useEffect, useState } from 'react';
import { auth } from '@/api/authClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      try {
        // Small delay to let auth callback complete if it just happened
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const isAuth = await auth.isAuthenticated();
        
        if (isAuth) {
          // User is authenticated, navigate to dashboard
          navigate(createPageUrl('Dashboard'));
        } else {
          // Not authenticated, redirect to login with return URL
          const returnUrl = window.location.origin + createPageUrl('Dashboard');
          auth.redirectToLogin(returnUrl);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // On error, try navigating to dashboard (it will handle auth there)
        navigate(createPageUrl('Dashboard'));
      } finally {
        setChecking(false);
      }
    };

    checkAndRedirect();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading OrphaNova Labs...</p>
      </div>
    </div>
  );
}