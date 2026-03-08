// No authentication: app runs without sign-in. Name/email in localStorage for profile only.
const GUEST_STORAGE_KEYS = {
  name: 'orphanova_guest_name',
  email: 'orphanova_guest_email',
  preferences: 'orphanova_guest_preferences',
  profile_picture: 'orphanova_guest_profile_picture',
};

function safeGetItem(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function safeRemoveItem(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {}
}

function getGuestUser() {
  const name = safeGetItem(GUEST_STORAGE_KEYS.name) || 'User';
  const email = safeGetItem(GUEST_STORAGE_KEYS.email) || '';
  let preferences = {};
  try {
    const raw = safeGetItem(GUEST_STORAGE_KEYS.preferences);
    preferences = raw ? JSON.parse(raw) : {};
  } catch {
    preferences = {};
  }

  const profile_picture = safeGetItem(GUEST_STORAGE_KEYS.profile_picture) || null;

  return {
    uid: 'guest',
    full_name: name,
    email,
    photo_url: null,
    profile_picture,
    role: 'user',
    created_date: new Date().toISOString(),
    preferences,
  };
}

export const auth = {
  isAuthenticated: async () => true,

  redirectHome: () => {
    window.location.href = '/';
  },

  me: async () => getGuestUser(),

  logout: async () => {
    safeRemoveItem(GUEST_STORAGE_KEYS.name);
    safeRemoveItem(GUEST_STORAGE_KEYS.email);
    safeRemoveItem(GUEST_STORAGE_KEYS.preferences);
    window.location.href = '/';
  },

  updateMe: async (data) => {
    if (data.full_name != null) safeSetItem(GUEST_STORAGE_KEYS.name, data.full_name);
    if (data.email != null) safeSetItem(GUEST_STORAGE_KEYS.email, data.email);
    if (data.preferences != null) safeSetItem(GUEST_STORAGE_KEYS.preferences, JSON.stringify(data.preferences));
    if (data.profile_picture != null) safeSetItem(GUEST_STORAGE_KEYS.profile_picture, data.profile_picture);
    return { ...getGuestUser(), ...data };
  },
};
