import { FIREBASE } from './config.js';

function probeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage;
  } catch {
    return null;
  }
}

const memoryStore = { members: {}, labRuns: [], portfolio: {}, milestones: [], journal: {}, certificates: {}, leaderboard: {}, admins: new Set(['local-member']) };
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

function isPermissionError(err) {
  return err?.code === 'permission-denied' || (err?.message && err.message.toLowerCase().includes('permission'));
}

export async function getMember(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const members = readLocalMembers();
    return members[uid] ?? null;
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDoc(firestore.doc(db, 'members', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    if (isPermissionError(err)) {
      console.warn('Firestore permission denied; using local member fallback.');
      const members = readLocalMembers();
      return members[uid] ?? null;
    }
    throw err;
  }
}

export async function setMember(uid, data, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const members = readLocalMembers();
    members[uid] = data;
    writeLocalMembers(members);
    return;
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    await firestore.setDoc(firestore.doc(db, 'members', uid), data);
  } catch (err) {
    if (isPermissionError(err)) {
      console.warn('Firestore permission denied; saving member locally.');
      const members = readLocalMembers();
      members[uid] = data;
      writeLocalMembers(members);
      return;
    }
    throw err;
  }
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

export async function getLabRuns(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return memoryStore.labRuns.filter((r) => r.memberId === uid);
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const q = firestore.query(firestore.collection(db, 'labRuns'), firestore.where('memberId', '==', uid));
    const snap = await firestore.getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (err) {
    if (isPermissionError(err)) {
      return memoryStore.labRuns.filter((r) => r.memberId === uid);
    }
    throw err;
  }
}

export async function getAllLabRuns({ firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return [...memoryStore.labRuns];
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDocs(firestore.collection(db, 'labRuns'));
    return snap.docs.map((d) => d.data());
  } catch (err) {
    if (isPermissionError(err)) {
      return [...memoryStore.labRuns];
    }
    throw err;
  }
}

export async function getPortfolioEntries(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return Object.entries(memoryStore.portfolio)
      .filter(([key]) => key.startsWith(`${uid}/`))
      .map(([, entry]) => entry);
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  const snap = await firestore.getDocs(firestore.collection(db, 'portfolio', uid, 'entries'));
  return snap.docs.map((d) => ({ week: Number(d.id), ...d.data() }));
}

export async function getPublicPortfolio(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return Object.entries(memoryStore.portfolio)
      .filter(([key, entry]) => key.startsWith(`${uid}/`) && entry.published)
      .map(([, entry]) => entry);
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  const q = firestore.query(firestore.collection(db, 'portfolio', uid, 'entries'), firestore.where('published', '==', true));
  const snap = await firestore.getDocs(q);
  return snap.docs.map((d) => ({ week: Number(d.id), ...d.data() }));
}

export async function setPortfolioPublished(uid, week, published, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const key = `${uid}/${week}`;
    const existing = memoryStore.portfolio[key] ?? { week, promptText: '', outputSnippet: '', rubricScore: 0 };
    memoryStore.portfolio[key] = { ...existing, published };
    return;
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  await firestore.setDoc(firestore.doc(db, 'portfolio', uid, 'entries', String(week)), { published }, { merge: true });
}

export async function checkIsAdmin(uid, { firebaseConfig = FIREBASE } = {}) {
  if (!uid) return false;
  if (isLocalMode(firebaseConfig)) {
    return memoryStore.admins.has(uid);
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDoc(firestore.doc(db, 'admins', uid));
    return snap.exists();
  } catch (err) {
    if (isPermissionError(err)) {
      return memoryStore.admins.has(uid);
    }
    throw err;
  }
}

export async function getAllMembers({ firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const membersMap = readLocalMembers();
    return Object.values(membersMap);
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDocs(firestore.collection(db, 'members'));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      const membersMap = readLocalMembers();
      return Object.values(membersMap);
    }
    throw err;
  }
}

export async function submitMilestone(uid, data, { firebaseConfig = FIREBASE } = {}) {
  const id = `${uid}-w${data.week}`;
  const record = {
    id,
    memberId: uid,
    week: Number(data.week),
    repoUrl: data.repoUrl || '',
    demoUrl: data.demoUrl || '',
    notes: data.notes || '',
    memberName: data.memberName || 'Member',
    status: 'pending',
    submittedAt: Date.now(),
  };

  if (isLocalMode(firebaseConfig)) {
    const idx = memoryStore.milestones.findIndex((m) => m.id === id);
    if (idx >= 0) {
      memoryStore.milestones[idx] = { ...memoryStore.milestones[idx], ...record };
    } else {
      memoryStore.milestones.push(record);
    }
    return record;
  }

  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  await firestore.setDoc(firestore.doc(db, 'milestones', id), record);
  return record;
}

export async function getMilestones(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return memoryStore.milestones.filter((m) => m.memberId === uid);
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  const q = firestore.query(firestore.collection(db, 'milestones'), firestore.where('memberId', '==', uid));
  const snap = await firestore.getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getAllMilestones({ firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return [...memoryStore.milestones];
  }
  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  const snap = await firestore.getDocs(firestore.collection(db, 'milestones'));
  return snap.docs.map((d) => d.data());
}

export async function reviewMilestone(id, { status, feedback, reviewerName }, { firebaseConfig = FIREBASE } = {}) {
  const updates = {
    status,
    feedback: feedback || '',
    reviewerName: reviewerName || 'Lead',
    reviewedAt: Date.now(),
  };

  if (isLocalMode(firebaseConfig)) {
    const idx = memoryStore.milestones.findIndex((m) => m.id === id);
    if (idx >= 0) {
      memoryStore.milestones[idx] = { ...memoryStore.milestones[idx], ...updates };
      return memoryStore.milestones[idx];
    }
    return null;
  }

  const { db, firestore } = await getFirestoreHandles(firebaseConfig);
  await firestore.updateDoc(firestore.doc(db, 'milestones', id), updates);
  return { id, ...updates };
}

function addLocalJournalEntry(uid, item) {
  if (!memoryStore.journal[uid]) {
    try {
      memoryStore.journal[uid] = JSON.parse(browserStorage?.getItem(`journal_${uid}`) || '[]');
    } catch {
      memoryStore.journal[uid] = [];
    }
  }
  memoryStore.journal[uid].unshift(item);
  try {
    browserStorage?.setItem(`journal_${uid}`, JSON.stringify(memoryStore.journal[uid]));
  } catch {}
  return item;
}

function getLocalJournalEntries(uid) {
  if (!memoryStore.journal[uid]) {
    try {
      memoryStore.journal[uid] = JSON.parse(browserStorage?.getItem(`journal_${uid}`) || '[]');
    } catch {
      memoryStore.journal[uid] = [];
    }
  }
  return [...memoryStore.journal[uid]];
}

export async function addJournalEntry(uid, entry, { firebaseConfig = FIREBASE } = {}) {
  const item = {
    id: `j-${Date.now()}`,
    memberId: uid,
    ...entry,
    createdAt: entry.createdAt || Date.now(),
  };

  if (isLocalMode(firebaseConfig)) {
    return addLocalJournalEntry(uid, item);
  }

  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const docRef = await firestore.addDoc(firestore.collection(db, 'journal', uid, 'entries'), item);
    return { id: docRef.id, ...item };
  } catch (err) {
    if (isPermissionError(err)) {
      return addLocalJournalEntry(uid, item);
    }
    throw err;
  }
}

export async function getJournalEntries(uid, { firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    return getLocalJournalEntries(uid);
  }

  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const q = firestore.query(
      firestore.collection(db, 'journal', uid, 'entries'),
      firestore.orderBy('createdAt', 'desc')
    );
    const snap = await firestore.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      return getLocalJournalEntries(uid);
    }
    throw err;
  }
}

function readLocalCertificates() {
  if (!browserStorage) return memoryStore.certificates;
  try {
    return JSON.parse(browserStorage.getItem('certificates') || '{}');
  } catch {
    return {};
  }
}

function writeLocalCertificates(certs) {
  if (!browserStorage) {
    memoryStore.certificates = certs;
    return;
  }
  try {
    browserStorage.setItem('certificates', JSON.stringify(certs));
  } catch {}
}

export async function getCertificate(certId, { firebaseConfig = FIREBASE } = {}) {
  if (!certId) return null;
  if (isLocalMode(firebaseConfig)) {
    const certs = readLocalCertificates();
    return certs[certId] ?? null;
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDoc(firestore.doc(db, 'certificates', certId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    if (isPermissionError(err)) {
      const certs = readLocalCertificates();
      return certs[certId] ?? null;
    }
    throw err;
  }
}

export async function getMemberCertificates(uid, { firebaseConfig = FIREBASE } = {}) {
  if (!uid) return [];
  if (isLocalMode(firebaseConfig)) {
    const certs = readLocalCertificates();
    return Object.values(certs).filter((c) => c.recipientUid === uid);
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const q = firestore.query(
      firestore.collection(db, 'certificates'),
      firestore.where('recipientUid', '==', uid)
    );
    const snap = await firestore.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      const certs = readLocalCertificates();
      return Object.values(certs).filter((c) => c.recipientUid === uid);
    }
    throw err;
  }
}

export async function issueCertificate(data, { firebaseConfig = FIREBASE } = {}) {
  const certId = data.certId || `GDGOC-AI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const record = {
    ...data,
    certId,
    issuedAt: data.issuedAt || Date.now(),
    status: 'valid',
  };

  if (isLocalMode(firebaseConfig)) {
    const certs = readLocalCertificates();
    certs[certId] = record;
    writeLocalCertificates(certs);
    return record;
  }

  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    await firestore.setDoc(firestore.doc(db, 'certificates', certId), record);
    return record;
  } catch (err) {
    if (isPermissionError(err)) {
      const certs = readLocalCertificates();
      certs[certId] = record;
      writeLocalCertificates(certs);
      return record;
    }
    throw err;
  }
}

export async function getAllCertificates({ firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const certs = readLocalCertificates();
    return Object.values(certs);
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDocs(firestore.collection(db, 'certificates'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      const certs = readLocalCertificates();
      return Object.values(certs);
    }
    throw err;
  }
}

function readLocalLeaderboard() {
  if (!browserStorage) return memoryStore.leaderboard;
  try {
    return JSON.parse(browserStorage.getItem('leaderboard') || '{}');
  } catch {
    return {};
  }
}

function writeLocalLeaderboard(entries) {
  if (!browserStorage) {
    memoryStore.leaderboard = entries;
    return;
  }
  try {
    browserStorage.setItem('leaderboard', JSON.stringify(entries));
  } catch {
    // storage unavailable or full; local mode degrades to in-memory only
  }
}

// Public-safe leaderboard projection: name/level/department/careerGoal are
// self-written (see syncLeaderboardProfile below); xp/labsPassed/streak are
// written only by the grading Worker's service account (never by this
// client) -- see firestore.rules' leaderboard/{uid} rule.
export async function getAllLeaderboardEntries({ firebaseConfig = FIREBASE } = {}) {
  if (isLocalMode(firebaseConfig)) {
    const entries = readLocalLeaderboard();
    return Object.entries(entries).map(([uid, data]) => ({ uid, ...data }));
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    const snap = await firestore.getDocs(firestore.collection(db, 'leaderboard'));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    if (isPermissionError(err)) {
      const entries = readLocalLeaderboard();
      return Object.entries(entries).map(([uid, data]) => ({ uid, ...data }));
    }
    throw err;
  }
}

// Merge-writes only the public-safe directory fields to the member's own
// leaderboard doc; never touches xp/labsPassed/streak, and a merge write
// (not a full setDoc) is required so this doesn't clobber those
// Worker-written fields -- see firestore.rules' hasOnly(...) check, which
// a non-merge write would fail once the Worker has already written xp etc.
export async function syncLeaderboardProfile(uid, fields, { firebaseConfig = FIREBASE } = {}) {
  const safeFields = {};
  for (const key of ['name', 'level', 'department', 'careerGoal']) {
    if (fields[key] !== undefined) safeFields[key] = fields[key];
  }
  if (isLocalMode(firebaseConfig)) {
    const entries = readLocalLeaderboard();
    entries[uid] = { ...entries[uid], ...safeFields };
    writeLocalLeaderboard(entries);
    return;
  }
  try {
    const { db, firestore } = await getFirestoreHandles(firebaseConfig);
    await firestore.setDoc(firestore.doc(db, 'leaderboard', uid), safeFields, { merge: true });
  } catch (err) {
    if (isPermissionError(err)) {
      const entries = readLocalLeaderboard();
      entries[uid] = { ...entries[uid], ...safeFields };
      writeLocalLeaderboard(entries);
      return;
    }
    throw err;
  }
}
