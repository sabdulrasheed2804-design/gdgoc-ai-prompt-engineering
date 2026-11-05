import { isLocalMode, getLabRuns, getPortfolioEntries, getPublicPortfolio } from './store.js';
import { signIn, onAuthChange, warmUp } from './auth.js';
import { renderRoadmap, wireLabForms } from './roadmap.js';
import { renderDashboard } from './dashboard.js';
import { computeStats } from './stats.js';
import { initRouter } from './router.js';
import { renderPortfolioManager, wirePortfolioToggles, renderPublicPortfolio } from './portfolio.js';
import { WEEKS } from './data.js';

const signInButton = document.getElementById('sign-in');
const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');

const PUBLIC_PORTFOLIO_PREFIX = '#public/';
const startedOnPublicRoute = window.location.hash.startsWith(PUBLIC_PORTFOLIO_PREFIX);

// A hash-only change (e.g. a signed-in member typing a #public/<uid> link into
// the address bar, or vice versa) never reloads the page, so the one-time
// check below would never re-run. Force a real reload when crossing that
// boundary, so the public-vs-signed-in branch always reflects the current URL.
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith(PUBLIC_PORTFOLIO_PREFIX) !== startedOnPublicRoute) {
    window.location.reload();
  }
});

if (startedOnPublicRoute) {
  const uid = window.location.hash.slice(PUBLIC_PORTFOLIO_PREFIX.length);
  signInButton.hidden = true;
  navEl.hidden = true;
  getPublicPortfolio(uid)
    .then((entries) => renderPublicPortfolio(appEl, entries))
    .catch((err) => {
      console.error('failed to load public portfolio', err);
      appEl.innerHTML = '<p class="route-error">Couldn\'t load this portfolio. Please refresh.</p>';
    });
} else {
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

  async function renderPortfolioRoute(mountEl, isStale) {
    const entries = await getPortfolioEntries(currentMember.uid);
    if (isStale()) return;
    renderPortfolioManager(mountEl, entries);
    wirePortfolioToggles(mountEl, currentMember.uid, () => router.refresh());
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
        portfolio: renderPortfolioRoute,
      }, { fallback: 'dashboard', navEl });
    } else {
      router.refresh();
    }
  });
}
