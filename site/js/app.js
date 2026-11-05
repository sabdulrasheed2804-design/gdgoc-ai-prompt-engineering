import { isLocalMode, getLabRuns } from './store.js';
import { signIn, onAuthChange, warmUp } from './auth.js';
import { renderRoadmap, wireLabForms } from './roadmap.js';
import { renderDashboard } from './dashboard.js';
import { computeStats } from './stats.js';
import { initRouter } from './router.js';
import { WEEKS } from './data.js';

const signInButton = document.getElementById('sign-in');
const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');

const TOTAL_LABS = WEEKS.filter((w) => w.lab).length;

let currentMember = null;
let router = null;

warmUp();
signInButton.textContent = isLocalMode() ? 'Continue' : 'Continue with Google';

signInButton.addEventListener('click', async () => {
  await signIn();
});

async function renderDashboardRoute(mountEl, isStale) {
  const labRuns = await getLabRuns(currentMember.uid);
  if (isStale()) return;
  renderDashboard(mountEl, { member: currentMember, stats: computeStats(labRuns, { totalLabs: TOTAL_LABS }) });
}

function renderRoadmapRoute(mountEl) {
  renderRoadmap(mountEl, WEEKS);
  wireLabForms(mountEl, currentMember.uid);
}

onAuthChange((member) => {
  if (!member) return;
  currentMember = member;
  signInButton.textContent = member.name;
  navEl.hidden = false;

  if (!router) {
    router = initRouter(appEl, {
      dashboard: renderDashboardRoute,
      roadmap: renderRoadmapRoute,
    }, { fallback: 'dashboard', navEl });
  } else {
    router.refresh();
  }
});
