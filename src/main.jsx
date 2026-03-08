import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCFkpcxebXpT6idu74dUvypf6GQFaauX_Q",
  authDomain: "orphanovalabs.firebaseapp.com",
  projectId: "orphanovalabs",
  storageBucket: "orphanovalabs.firebasestorage.app",
  messagingSenderId: "788467784982",
  appId: "1:788467784982:web:e25b51a9dbaf49d1424437",
  measurementId: "G-6BBTX7FY52"
};

let app;
try {
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    try { getAnalytics(app); } catch (_) {}
  }
} catch (e) {
  console.error('Firebase init:', e);
}

export const firebase_app = app;

class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(err) {
    return { error: err };
  }
  componentDidCatch(err, info) {
    console.error('App error:', err, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#0f172a', color: '#f87171', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.error?.message || String(this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}