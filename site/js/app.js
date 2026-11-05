import { isLocalMode } from './store.js';
import { signIn, onAuthChange, warmUp } from './auth.js';
import { renderRoadmap, wireLabForms } from './roadmap.js';
import { WEEKS } from './data.js';

const signInButton = document.getElementById('sign-in');
const appEl = document.getElementById('app');

warmUp();
signInButton.textContent = isLocalMode() ? 'Continue' : 'Continue with Google';

signInButton.addEventListener('click', async () => {
  await signIn();
});

onAuthChange((member) => {
  if (!member) return;
  signInButton.textContent = member.name;
  renderRoadmap(appEl, WEEKS);
  wireLabForms(appEl, member.uid);
});
