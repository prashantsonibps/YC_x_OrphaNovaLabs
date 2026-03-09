import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, db } from '@/firebase';

function getCurrentUser() {
  return firebaseAuth.currentUser;
}

async function getUserProfile() {
  const fbUser = getCurrentUser();
  if (!fbUser) return null;

  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { uid: fbUser.uid, ...snap.data() };
  }

  return {
    uid: fbUser.uid,
    full_name: fbUser.displayName || '',
    email: fbUser.email || '',
    photo_url: fbUser.photoURL || null,
    profile_picture: null,
    role: 'user',
    created_date: new Date().toISOString(),
    preferences: {},
  };
}

export const auth = {
  isAuthenticated: async () => !!getCurrentUser(),

  redirectHome: () => {
    window.location.href = '/Dashboard';
  },

  me: async () => {
    return getUserProfile();
  },

  logout: async () => {
    await signOut(firebaseAuth);
    window.location.href = '/login';
  },

  updateMe: async (data) => {
    const fbUser = getCurrentUser();
    if (!fbUser) throw new Error('Not authenticated');

    const ref = doc(db, 'users', fbUser.uid);
    const updateData = { ...data, updated_date: serverTimestamp() };
    delete updateData.uid;
    await setDoc(ref, updateData, { merge: true });

    return getUserProfile();
  },
};
