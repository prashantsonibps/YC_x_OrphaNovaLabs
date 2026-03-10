import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, db } from '@/firebase';

const ADMIN_EMAILS = [
  'psoni@mail.yu.edu',
  'prashantsonibps@gmail.com',
];

const PROFILE_TIMEOUT_MS = 8000;

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function buildFallbackProfile(firebaseUser) {
  return {
    uid: firebaseUser.uid,
    full_name: firebaseUser.displayName || '',
    email: firebaseUser.email || '',
    photo_url: firebaseUser.photoURL || null,
    profile_picture: null,
    role: ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase()) ? 'admin' : 'user',
    preferences: {},
    created_date: new Date().toISOString(),
  };
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        const fallback = buildFallbackProfile(firebaseUser);
        if (!profileLoadedRef.current) {
          setUserProfile(fallback);
        }
        setLoading(false);

        withTimeout(ensureUserProfile(firebaseUser), PROFILE_TIMEOUT_MS)
          .then((profile) => {
            profileLoadedRef.current = true;
            setUserProfile(profile);
          })
          .catch((err) => {
            console.warn('Profile load failed, using fallback:', err.message);
            if (!profileLoadedRef.current) {
              setUserProfile(fallback);
            }
          });
      } else {
        setUser(null);
        setUserProfile(null);
        profileLoadedRef.current = false;
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  async function ensureUserProfile(firebaseUser) {
    const ref = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      if (data.photo_url !== firebaseUser.photoURL || data.full_name !== firebaseUser.displayName) {
        await setDoc(ref, {
          full_name: firebaseUser.displayName || data.full_name,
          photo_url: firebaseUser.photoURL || data.photo_url,
          updated_date: serverTimestamp(),
        }, { merge: true });
      }
      return {
        uid: firebaseUser.uid,
        ...data,
        full_name: firebaseUser.displayName || data.full_name,
        photo_url: firebaseUser.photoURL || data.photo_url,
      };
    }

    const role = ADMIN_EMAILS.includes(firebaseUser.email?.toLowerCase()) ? 'admin' : 'user';
    const newProfile = {
      uid: firebaseUser.uid,
      full_name: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      photo_url: firebaseUser.photoURL || null,
      profile_picture: null,
      role,
      bio: '',
      preferences: {},
      created_date: serverTimestamp(),
      updated_date: serverTimestamp(),
    };
    await setDoc(ref, newProfile);
    return { ...newProfile, uid: firebaseUser.uid };
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  }

  async function loginWithApple() {
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  }

  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return result.user;
  }

  async function signUpWithEmail(email, password, displayName) {
    const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    return result.user;
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(firebaseAuth, email);
  }

  async function logout() {
    profileLoadedRef.current = false;
    await signOut(firebaseAuth);
  }

  async function updateUserProfile(data) {
    if (!user) return null;
    try {
      const ref = doc(db, 'users', user.uid);
      await withTimeout(
        setDoc(ref, { ...data, updated_date: serverTimestamp() }, { merge: true }),
        PROFILE_TIMEOUT_MS
      );
      const snap = await withTimeout(getDoc(ref), PROFILE_TIMEOUT_MS);
      const updated = { uid: user.uid, ...snap.data() };
      setUserProfile(updated);
      return updated;
    } catch (err) {
      console.error('updateUserProfile failed:', err);
      const updated = { ...userProfile, ...data };
      setUserProfile(updated);
      return updated;
    }
  }

  async function refreshProfile() {
    if (!user) return null;
    try {
      const ref = doc(db, 'users', user.uid);
      const snap = await withTimeout(getDoc(ref), PROFILE_TIMEOUT_MS);
      if (snap.exists()) {
        const profile = { uid: user.uid, ...snap.data() };
        setUserProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('refreshProfile failed:', err.message);
    }
    return userProfile;
  }

  const isAdmin = userProfile?.role === 'admin' ||
    ADMIN_EMAILS.includes(user?.email?.toLowerCase());

  const value = {
    user,
    userProfile,
    loading,
    isAdmin,
    loginWithGoogle,
    loginWithApple,
    loginWithEmail,
    signUpWithEmail,
    resetPassword,
    logout,
    updateUserProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
