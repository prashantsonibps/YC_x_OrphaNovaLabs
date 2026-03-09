import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as firestoreLimit, serverTimestamp,
  writeBatch, setDoc,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, firebaseAuth } from '@/firebase';

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

function makeEntity(collectionName) {
  return {
    list: async () => {
      const snap = await getDocs(userCollection(collectionName));
      return snap.docs.map(docToItem);
    },

    filter: async (queryObj = {}, sortBy = '-created_date', max = 100) => {
      let ref = userCollection(collectionName);
      let q = query(ref);

      const constraints = [];
      for (const [key, val] of Object.entries(queryObj)) {
        if (val !== undefined && val !== null) {
          constraints.push(where(key, '==', val));
        }
      }

      const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
      const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';

      if (constraints.length > 0) {
        q = query(ref, ...constraints);
      }

      try {
        q = query(ref, ...constraints, orderBy(sortField, sortDir), firestoreLimit(max));
      } catch {
        q = query(ref, ...constraints, firestoreLimit(max));
      }

      const snap = await getDocs(q);
      let items = snap.docs.map(docToItem);

      items.sort((a, b) => {
        const dateA = new Date(a[sortField] || 0);
        const dateB = new Date(b[sortField] || 0);
        return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
      });

      return items.slice(0, max);
    },

    get: async (id) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      const snap = await getDoc(ref);
      return snap.exists() ? docToItem(snap) : null;
    },

    create: async (data) => {
      const now = serverTimestamp();
      const payload = { ...data, created_date: now, updated_date: now };
      const ref = await addDoc(userCollection(collectionName), payload);
      return { id: ref.id, ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    },

    update: async (id, data) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      await updateDoc(ref, { ...data, updated_date: serverTimestamp() });
      const snap = await getDoc(ref);
      return snap.exists() ? docToItem(snap) : null;
    },

    delete: async (id) => {
      const uid = getUid();
      if (!uid) return null;
      const ref = doc(db, 'users', uid, collectionName, id);
      await deleteDoc(ref);
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
      const snap = await getDocs(globalCollection(collectionName));
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
      try {
        const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
        const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
        q = query(ref, ...constraints, orderBy(sortField, sortDir), firestoreLimit(max));
      } catch {
        q = query(ref, ...constraints, firestoreLimit(max));
      }

      const snap = await getDocs(q);
      let items = snap.docs.map(docToItem);
      const sortField = sortBy.startsWith('-') ? sortBy.slice(1) : sortBy;
      const sortDir = sortBy.startsWith('-') ? 'desc' : 'asc';
      items.sort((a, b) => {
        const dateA = new Date(a[sortField] || 0);
        const dateB = new Date(b[sortField] || 0);
        return sortDir === 'desc' ? dateB - dateA : dateA - dateB;
      });
      return items.slice(0, max);
    },

    get: async (id) => {
      const ref = doc(db, collectionName, id);
      const snap = await getDoc(ref);
      return snap.exists() ? docToItem(snap) : null;
    },

    create: async (data) => {
      const now = serverTimestamp();
      const payload = { ...data, created_date: now, updated_date: now };
      const ref = await addDoc(globalCollection(collectionName), payload);
      return { id: ref.id, ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    },

    update: async (id, data) => {
      const ref = doc(db, collectionName, id);
      await updateDoc(ref, { ...data, updated_date: serverTimestamp() });
      const snap = await getDoc(ref);
      return snap.exists() ? docToItem(snap) : null;
    },

    delete: async (id) => {
      const ref = doc(db, collectionName, id);
      await deleteDoc(ref);
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

    await batch.commit();
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
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const existing = snap.data();
      if (!existing.full_name && profileUpdate.full_name && firebaseAuth.currentUser) {
        await updateProfile(firebaseAuth.currentUser, { displayName: profileUpdate.full_name });
      }
    }
    await setDoc(userRef, { ...profileUpdate, updated_date: serverTimestamp() }, { merge: true });
  }

  localStorage.setItem(LS_MIGRATION_KEY, uid);

  return { migrated: true, totalDocs };
}
