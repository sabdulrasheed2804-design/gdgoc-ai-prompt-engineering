import { FIREBASE } from './config.js';
import { isLocalMode } from './store.js';

let functionsPromise = null;
async function getFunctionsHandle() {
  if (!functionsPromise) {
    functionsPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const functionsModule = await import('firebase/functions');
      const app = initializeApp(FIREBASE);
      return { functions: functionsModule.getFunctions(app), functionsModule };
    })();
  }
  return functionsPromise;
}

export async function submitLab({ week, labId, promptText }) {
  if (isLocalMode()) {
    throw new Error(
      'Lab grading needs the live grading function and is not available in local mode.'
    );
  }
  const { functions, functionsModule } = await getFunctionsHandle();
  const gradeLab = functionsModule.httpsCallable(functions, 'gradeLab');
  const result = await gradeLab({ week, labId, promptText });
  return result.data;
}
