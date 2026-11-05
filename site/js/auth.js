import { FIREBASE } from './config.js';
import { isLocalMode, getMember, setMember } from './store.js';

const LOCAL_MEMBER = { uid: 'local-member', name: 'Local Member', email: null };
const localListeners = new Set();

let authPromise = null;
async function getAuthHandles() {
  if (!authPromise) {
    authPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const auth = await import('firebase/auth');
      const app = initializeApp(FIREBASE);
      return { auth: auth.getAuth(app), authModule: auth };
    })();
  }
  return authPromise;
}

// Call once, early in boot (never at module scope -- that would run the
// dynamic import as a side effect of merely importing this file, including
// from tests). Warms firebase/auth up front so signIn()'s signInWithPopup
// call runs right after the click with no intervening await -- otherwise
// the gap while firebase/auth loads from the CDN risks Chrome no longer
// treating the popup as triggered by a direct user gesture.
export function warmUp() {
  if (!isLocalMode()) getAuthHandles();
}

export async function signIn() {
  if (isLocalMode()) {
    const existing = await getMember(LOCAL_MEMBER.uid);
    if (!existing) await setMember(LOCAL_MEMBER.uid, LOCAL_MEMBER);
    const member = existing ?? LOCAL_MEMBER;
    localListeners.forEach((listener) => listener(member));
    return;
  }
  const { auth, authModule } = await getAuthHandles();
  await authModule.signInWithPopup(auth, new authModule.GoogleAuthProvider());
}

export async function signOut() {
  if (isLocalMode()) return;
  const { auth, authModule } = await getAuthHandles();
  await authModule.signOut(auth);
}

export async function getIdToken() {
  if (isLocalMode()) return null;
  const { auth } = await getAuthHandles();
  if (!auth.currentUser) return null;
  return auth.currentUser.getIdToken();
}

export function onAuthChange(callback) {
  if (isLocalMode()) {
    localListeners.add(callback);
    getMember(LOCAL_MEMBER.uid).then((member) => callback(member ?? null));
    return;
  }
  getAuthHandles().then(({ auth, authModule }) => {
    authModule.onAuthStateChanged(auth, (user) => {
      callback(
        user ? { uid: user.uid, name: user.displayName, email: user.email } : null
      );
    });
  });
}
