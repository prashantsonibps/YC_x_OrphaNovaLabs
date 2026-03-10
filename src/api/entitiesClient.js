import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as firestoreLimit, serverTimestamp,
  writeBatch, setDoc,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, firebaseAuth } from '@/firebase';

const REQUEST_TIMEOUT_MS = 10000;

function withTimeout(promise, ms = REQUEST_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Firestore request timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function getUid() {
  return firebaseAuth.currentUser?.uid || null;
}

function userCollection(collectionName) {
  const uid = getUid();
  if (!uid) throw new Error('Not authenticated');
  return collection(db, 'users', uid, collectionName);
}

function toPlainDate(val) {
  if (!val) return null;
  if (val.toDate) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date(val).toISOString();
}

function docToItem(d) {
  const data = d.data();
  return {
    ...data,
    id: d.id,
    created_date: toPlainDate(data.created_date),
    updated_date: toPlainDate(data.updated_date),
  };
}

function matchesQuery(item, queryObj = {}) {
  for (const [key, val] of Object.entries(queryObj)) {
    if (val !== undefined && val !== null && item[key] !== val) {
      return false;
    }
  }
  return true;
}

function sortItems(items, sortBy) {
  const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
  const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
  return [...items].sort((a, b) => {
    const dateA = new Date(a[sortField] || 0);
    const dateB = new Date(b[sortField] || 0);
    return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
  });
}

function makeEntity(collectionName) {
  return {
    list: async () => {
      const snap = await withTimeout(getDocs(userCollection(collectionName)));
      return snap.docs.map(docToItem);
    },

    filter: async (queryObj = {}, sortBy = '-created_date', max = 100) => {
      let ref = userCollection(collectionName);

      const constraints = [];
      for (const [key, val] of Object.entries(queryObj)) {
        if (val !== undefined && val !== null) {
          constraints.push(where(key, '==', val));
        }
      }

      const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
      const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
      // Try best-performance query first (where + orderBy + limit).
      try {
        const q = query(ref, ...constraints, orderBy(sortField, sortDir), firestoreLimit(max));
        const snap = await withTimeout(getDocs(q));
        return snap.docs.map(docToItem);
      } catch (err) {
        // Missing composite index is common in dev/prod drift.
        console.warn(`Index fallback (${collectionName}):`, err?.message || err);
      }

      // Fallback 1: where + limit (no orderBy), then sort in memory.
      try {
        const q = query(ref, ...constraints, firestoreLimit(max * 3));
        const snap = await withTimeout(getDocs(q));
        const items = sortItems(snap.docs.map(docToItem), sortBy);
        return items.slice(0, max);
      } catch (err) {
        console.warn(`Where fallback failed (${collectionName}):`, err?.message || err);
      }

      // Fallback 2: full collection scan, filter/sort client-side.
      const fullSnap = await withTimeout(getDocs(ref));
      const filtered = fullSnap.docs.map(docToItem).filter((i) => matchesQuery(i, queryObj));
      return sortItems(filtered, sortBy).slice(0, max);
    },

    get: async (id) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      const snap = await withTimeout(getDoc(ref));
      return snap.exists() ? docToItem(snap) : null;
    },

    create: async (data) => {
      const now = serverTimestamp();
      const payload = { ...data, created_date: now, updated_date: now };
      const ref = await withTimeout(addDoc(userCollection(collectionName), payload));
      return { id: ref.id, ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    },

    update: async (id, data) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      await withTimeout(updateDoc(ref, { ...data, updated_date: serverTimestamp() }));
      const snap = await withTimeout(getDoc(ref));
      return snap.exists() ? docToItem(snap) : null;
    },

    delete: async (id) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      await withTimeout(deleteDoc(ref));
      return { id };
    },
  };
}

// Global entities (not per-user) for admin-managed data like notifications
function globalCollection(collectionName) {
  return collection(db, collectionName);
}

function makeGlobalEntity(collectionName) {
  return {
    list: async () => {
      const snap = await withTimeout(getDocs(globalCollection(collectionName)));
      return snap.docs.map(docToItem);
    },

    filter: async (queryObj = {}, sortBy = '-created_date', max = 100) => {
      let ref = globalCollection(collectionName);
      const constraints = [];
      for (const [key, val] of Object.entries(queryObj)) {
        if (val !== undefined && val !== null) {
          constraints.push(where(key, '==', val));
        }
      }

      let q;
      const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
      const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
      try {
        q = query(ref, ...constraints, orderBy(sortField, sortDir), firestoreLimit(max));
        const snap = await withTimeout(getDocs(q));
        return snap.docs.map(docToItem);
      } catch (err) {
        console.warn(`Global index fallback (${collectionName}):`, err?.message || err);
      }

      try {
        q = query(ref, ...constraints, firestoreLimit(max * 3));
        const snap = await withTimeout(getDocs(q));
        const items = sortItems(snap.docs.map(docToItem), sortBy);
        return items.slice(0, max);
      } catch (err) {
        console.warn(`Global where fallback failed (${collectionName}):`, err?.message || err);
      }

      const fullSnap = await withTimeout(getDocs(ref));
      const filtered = fullSnap.docs.map(docToItem).filter((i) => matchesQuery(i, queryObj));
      return sortItems(filtered, sortBy).slice(0, max);
    },

    get: async (id) => {
      const ref = doc(db, collectionName, id);
      const snap = await withTimeout(getDoc(ref));
      return snap.exists() ? docToItem(snap) : null;
    },

    create: async (data) => {
      const now = serverTimestamp();
      const payload = { ...data, created_date: now, updated_date: now };
      const ref = await withTimeout(addDoc(globalCollection(collectionName), payload));
      return { id: ref.id, ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    },

    update: async (id, data) => {
      const ref = doc(db, collectionName, id);
      await withTimeout(updateDoc(ref, { ...data, updated_date: serverTimestamp() }));
      const snap = await withTimeout(getDoc(ref));
      return snap.exists() ? docToItem(snap) : null;
    },

    delete: async (id) => {
      const ref = doc(db, collectionName, id);
      await withTimeout(deleteDoc(ref));
      return { id };
    },
  };
}

export const entities = {
  WaitlistEntry:         makeGlobalEntity('waitlist_entries'),
  ResearchQuery:         makeEntity('research_queries'),
  CollaborationPost:     makeGlobalEntity('collaboration_posts'),
  ConnectionRequest:     makeGlobalEntity('connection_requests'),
  IntegrationSuggestion: makeGlobalEntity('integration_suggestions'),
  Project:               makeEntity('projects'),
  Literature:            makeEntity('literature'),
  Relation:              makeEntity('relations'),
  Hypothesis:            makeEntity('hypotheses'),
  Experiment:            makeEntity('experiments'),
  Review:                makeEntity('reviews'),
  Draft:                 makeEntity('drafts'),
  StageNote:             makeEntity('stage_notes'),
  Note:                  makeEntity('notes'),
  Notification:          makeGlobalEntity('notifications'),
  NotificationRead:      makeEntity('notification_reads'),
  User:                  makeGlobalEntity('users'),
};

// --- localStorage migration ---
const LS_MIGRATION_KEY = 'orphanova_firestore_migrated';

const MIGRATION_MAP = {
  orphanova_projects: 'projects',
  orphanova_research_queries: 'research_queries',
  orphanova_literature: 'literature',
  orphanova_relations: 'relations',
  orphanova_hypotheses: 'hypotheses',
  orphanova_experiments: 'experiments',
  orphanova_reviews: 'reviews',
  orphanova_drafts: 'drafts',
  orphanova_stage_notes: 'stage_notes',
  orphanova_notes: 'notes',
  orphanova_notification_reads: 'notification_reads',
};

export async function migrateLocalStorageToFirestore() {
  const uid = getUid();
  if (!uid) return { migrated: false, reason: 'not-authenticated' };

  const migrationFlag = localStorage.getItem(LS_MIGRATION_KEY);
  if (migrationFlag === uid) return { migrated: false, reason: 'already-migrated' };

  let totalDocs = 0;

  for (const [lsKey, fsCollection] of Object.entries(MIGRATION_MAP)) {
    let items = [];
    try {
      const raw = localStorage.getItem(lsKey);
      items = raw ? JSON.parse(raw) : [];
    } catch { continue; }

    if (!items.length) continue;

    const batch = writeBatch(db);
    for (const item of items) {
      const oldId = item.id;
      const docData = { ...item };
      delete docData.id;
      if (docData.created_date && typeof docData.created_date === 'string') {
        // keep as-is for migration
      }
      if (docData.updated_date && typeof docData.updated_date === 'string') {
        // keep as-is for migration
      }

      const ref = oldId
        ? doc(db, 'users', uid, fsCollection, oldId)
        : doc(collection(db, 'users', uid, fsCollection));
      batch.set(ref, docData, { merge: true });
      totalDocs++;
    }

    await withTimeout(batch.commit());
  }

  // Migrate guest profile data
  const guestName = localStorage.getItem('orphanova_guest_name');
  const guestEmail = localStorage.getItem('orphanova_guest_email');
  const guestPrefs = localStorage.getItem('orphanova_guest_preferences');
  const guestPic = localStorage.getItem('orphanova_guest_profile_picture');

  if (guestName || guestPrefs || guestPic) {
    const profileUpdate = {};
    if (guestName) profileUpdate.full_name = guestName;
    if (guestPic) profileUpdate.profile_picture = guestPic;
    if (guestPrefs) {
      try { profileUpdate.preferences = JSON.parse(guestPrefs); } catch {}
    }
    const userRef = doc(db, 'users', uid);
    const snap = await withTimeout(getDoc(userRef));
    if (snap.exists()) {
      const existing = snap.data();
      if (!existing.full_name && profileUpdate.full_name && firebaseAuth.currentUser) {
        await updateProfile(firebaseAuth.currentUser, { displayName: profileUpdate.full_name });
      }
    }
    await withTimeout(setDoc(userRef, { ...profileUpdate, updated_date: serverTimestamp() }, { merge: true }));
  }

  localStorage.setItem(LS_MIGRATION_KEY, uid);

  return { migrated: true, totalDocs };
}
