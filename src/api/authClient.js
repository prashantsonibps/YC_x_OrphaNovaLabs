import { auth_instance } from '../main.jsx';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth';

// Guest mode: no sign-in required. Name/email stored in localStorage for manual entry.
// Login/signup/redirectToLogin kept in file for possible re-assignment later.
const GUEST_STORAGE_KEYS = {
  name: 'orphanova_guest_name',
  email: 'orphanova_guest_email',
  preferences: 'orphanova_guest_preferences',
};

function getGuestUser() {
  return {
    uid: 'guest',
    full_name: typeof localStorage !== 'undefined' ? (localStorage.getItem(GUEST_STORAGE_KEYS.name) || 'User') : 'User',
    email: typeof localStorage !== 'undefined' ? (localStorage.getItem(GUEST_STORAGE_KEYS.email) || '') : '',
    photo_url: null,
    role: 'user',
    created_date: new Date().toISOString(),
    preferences: (() => {
      try {
        const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(GUEST_STORAGE_KEYS.preferences) : null;
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    })(),
  };
}

export const auth = {
  isAuthenticated: async () => {
    // No sign-in required: always treat as authenticated (guest mode).
    return true;
  },
  redirectToLogin: (returnUrl = '/') => {
    // Disabled: do not redirect to login. Go to app root so user stays in app.
    window.location.href = '/';
  },
  me: async () => {
    const user = auth_instance.currentUser;
    if (user) {
      return {
        uid: user.uid,
        full_name: user.displayName || 'User',
        email: user.email,
        photo_url: user.photoURL,
        role: 'user',
        created_date: user.metadata?.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString(),
        preferences: {}
      };
    }
    return getGuestUser();
  },
  logout: async () => {
    try {
      if (auth_instance.currentUser) {
        await signOut(auth_instance);
      } else {
        // Guest: clear stored name/email/preferences
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(GUEST_STORAGE_KEYS.name);
          localStorage.removeItem(GUEST_STORAGE_KEYS.email);
          localStorage.removeItem(GUEST_STORAGE_KEYS.preferences);
        }
      }
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  },
  // --- Login/signup/Google kept for possible re-assignment later ---
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth_instance, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  },
  signup: async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth_instance, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  },
  signInWithGoogle: async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth_instance, provider);
      return userCredential.user;
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      throw error;
    }
  },
  updateMe: async (data) => {
    const user = auth_instance.currentUser;
    if (user) {
      try {
        const updateData = {};
        if (data.full_name) updateData.displayName = data.full_name;
        if (data.photo_url) updateData.photoURL = data.photo_url;

        if (Object.keys(updateData).length > 0) {
          await updateProfile(user, updateData);
        }

        // For other custom fields like role, preferences, you would update a database here
        console.log('User profile updated in Firebase Auth and custom fields (if any) logged.');
        return { ...await auth.me(), ...data };
      } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
      }
    }
    // Guest: persist name/email/preferences to localStorage
    if (typeof localStorage !== 'undefined') {
      if (data.full_name != null) localStorage.setItem(GUEST_STORAGE_KEYS.name, data.full_name);
      if (data.email != null) localStorage.setItem(GUEST_STORAGE_KEYS.email, data.email);
      if (data.preferences != null) localStorage.setItem(GUEST_STORAGE_KEYS.preferences, JSON.stringify(data.preferences));
    }
    return { ...getGuestUser(), ...data };
  }
};