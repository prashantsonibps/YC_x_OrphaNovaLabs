// No sign-in/sign-up: app runs without authentication. Name/email stored in localStorage for profile.
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
  isAuthenticated: async () => true,

  redirectToLogin: () => {
    window.location.href = '/';
  },

  me: async () => getGuestUser(),

  logout: async () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(GUEST_STORAGE_KEYS.name);
      localStorage.removeItem(GUEST_STORAGE_KEYS.email);
      localStorage.removeItem(GUEST_STORAGE_KEYS.preferences);
    }
    window.location.href = '/';
  },

  updateMe: async (data) => {
    if (typeof localStorage !== 'undefined') {
      if (data.full_name != null) localStorage.setItem(GUEST_STORAGE_KEYS.name, data.full_name);
      if (data.email != null) localStorage.setItem(GUEST_STORAGE_KEYS.email, data.email);
      if (data.preferences != null) localStorage.setItem(GUEST_STORAGE_KEYS.preferences, JSON.stringify(data.preferences));
    }
    return { ...getGuestUser(), ...data };
  },
};
