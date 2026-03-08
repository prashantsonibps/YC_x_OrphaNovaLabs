import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

const app = initializeApp(firebaseConfig);
export const auth_instance = getAuth(app);

// Initialize Analytics only in browser environments
if (typeof window !== 'undefined') {
  getAnalytics(app);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)