import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyCFkpcxebXpT6idu74dUvypf6GQFaauX_Q',
  authDomain: 'orphanovalabs.firebaseapp.com',
  projectId: 'orphanovalabs',
  storageBucket: 'orphanovalabs.firebasestorage.app',
  messagingSenderId: '788467784982',
  appId: '1:788467784982:web:e25b51a9dbaf49d1424437',
  measurementId: 'G-6BBTX7FY52',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

if (typeof window !== 'undefined') {
  try { getAnalytics(app); } catch (_) {}
}

export default app;
