import { FIREBASE } from './config.js';

function probeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage;
  } catch {
    return null;
  }
}

const memoryStore = { members: {}, labRuns: [] };
const browserStorage = probeLocalStorage();

function readLocalMembers() {
  if (!browserStorage) return memoryStore.members;
  try {
    return JSON.parse(browserStorage.getItem('members') || '{}');
  } catch {
    return {};
  }
}

function writeLocalMembers(members) {
  if (!browserStorage) {
    memoryStore.members = members;
    return;
  }
  try {
    browserStorage.setItem('members', JSON.stringify(members));
  } catch {
    // storage unavailable or full; local mode degrades to in-memory only
  }
}

export function isLocalMode(firebaseConfig = FIREBASE) {
  return !firebaseConfig;
}

let firestorePromise = null;
async function getFirestoreHandles(firebaseConfig) {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const firestore = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      return { db: firestore.getFirestore(app), firestore };
    })();
  }
  return firestorePromise;
}

export async function getMember(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const members = readLocalMembers();
    return members[uid] ?? null;
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  const snap = await firestore.getDoc(firestore.doc(db, 'members', uid));
  return snap.exists() ? snap.data() : null;
}

export async function setMember(uid, data, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const members = readLocalMembers();
    members[uid] = data;
    writeLocalMembers(members);
    return;
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  await firestore.setDoc(firestore.doc(db, 'members', uid), data);
}

export async function recordLabRun(uid, run, { firebaseConfig = FIREBASE } = {}) {
  const entry = { memberId: uid, ...run };
  if (isLocalMode(firebaseConfig)) {
    memoryStore.labRuns.push(entry);
    return;
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  await firestore.addDoc(firestore.collection(db, 'labRuns'), entry);
}
