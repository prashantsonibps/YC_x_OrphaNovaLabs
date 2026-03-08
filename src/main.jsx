import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDidi6jezEQKL1D_g17bvYY5ym03nVEOZw",
  authDomain: "orphanova0auth.firebaseapp.com",
  projectId: "orphanova0auth",
  storageBucket: "orphanova0auth.firebasestorage.app",
  messagingSenderId: "59138646893",
  appId: "1:59138646893:web:de9c77512ae5259dbf3064",
  measurementId: "G-YFLGYN2YQG"
};

const app = initializeApp(firebaseConfig);
export const auth_instance = getAuth(app);

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 