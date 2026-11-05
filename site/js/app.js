import { isLocalMode } from './store.js';
import { signIn, onAuthChange } from './auth.js';

const signInButton = document.getElementById('sign-in');
signInButton.textContent = isLocalMode() ? 'Continue' : 'Continue with Google';

signInButton.addEventListener('click', async () => {
  await signIn();
});

onAuthChange((member) => {
  if (member) signInButton.textContent = member.name;
});
