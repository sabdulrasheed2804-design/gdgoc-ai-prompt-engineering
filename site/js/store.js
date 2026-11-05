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

export function isLocalMode() {
  return !FIREBASE;
}

let firestorePromise = null;
async function getFirestoreHandles() {
  if (!firestorePromise) {
    firestorePromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const firestore = await import('firebase/firestore');
      const app = initializeApp(FIREBASE);
      return { db: firestore.getFirestore(app), firestore };
    })();
  }
  return firestorePromise;
}

export async function getMember(uid) {
  if (isLocalMode()) {
    const members = readLocalMembers();
    return members[uid] ?? null;
  }
  const { db, firestore } = await getFirestoreHandles();
  const snap = await firestore.getDoc(firestore.doc(db, 'members', uid));
  return snap.exists() ? snap.data() : null;
}

export async function setMember(uid, data) {
  if (isLocalMode()) {
    const members = readLocalMembers();
    members[uid] = data;
    writeLocalMembers(members);
    return;
  }
  const { db, firestore } = await getFirestoreHandles();
  await firestore.setDoc(firestore.doc(db, 'members', uid), data);
}

export async function recordLabRun(uid, run) {
  const entry = { memberId: uid, ...run };
  if (isLocalMode()) {
    memoryStore.labRuns.push(entry);
    return;
  }
  const { db, firestore } = await getFirestoreHandles();
  await firestore.addDoc(firestore.collection(db, 'labRuns'), entry);
}
