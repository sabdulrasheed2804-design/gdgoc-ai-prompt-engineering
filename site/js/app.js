import {
  isLocalMode, getMember, setMember, getAllMembers, checkIsAdmin,
  getLabRuns, getAllLabRuns, getPortfolioEntries, getPublicPortfolio,
  submitMilestone, getMilestones, getAllMilestones, reviewMilestone,
  addJournalEntry, getJournalEntries,
  issueCertificate, getCertificate, getMemberCertificates, getAllCertificates,
  getAllLeaderboardEntries, syncLeaderboardProfile,
} from './store.js';
import { signIn, onAuthChange, warmUp } from './auth.js';
import { renderWeekMenu, renderWeekDetail, wireLabForms, wireMilestoneForms } from './roadmap.js';
import { computeWeekUnlocks } from './progress.js';
import { renderDashboard } from './dashboard.js';
import { computeStats } from './stats.js';
import { initRouter } from './router.js';
import { renderPortfolioManager, wirePortfolioToggles, renderPublicPortfolio } from './portfolio.js';
import { wireLessonStepper } from './lesson.js';
import { renderRegistrationForm, renderProfileView, wireProfileForm } from './profile.js';
import { computeCohortStats, exportMembersToCsv, renderAdminDashboard, wireAdminDashboard } from './admin.js';
import { computeBadges, renderBadgeGrid } from './badges.js';
import { rankMembers, renderLeaderboard } from './leaderboard.js';
import { buildActivityMap, renderJournalView, wireJournalForm } from './journal.js';
import { renderCertificateView, renderPublicCertificateVerification, wireCertificateView } from './certificates.js';
import { renderPlayground, wirePlayground } from './playground.js';
import { WEEKS } from './data.js';
import { PROGRAM } from './config.js';
import { annotateWeekStatus } from './pacing.js';
import { escapeHtml } from './util.js';
import { initInstallPrompt } from './install-prompt.js';

const signInButton = document.getElementById('sign-in');
const appEl = document.getElementById('app');
const navEl = document.getElementById('main-nav');
const navToggle = document.getElementById('nav-toggle');

navToggle?.addEventListener('click', () => {
  const isOpen = navEl.classList.toggle('is-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navEl.addEventListener('click', (e) => {
  if (e.target.closest('a')) navEl.classList.remove('is-open');
});
window.addEventListener('hashchange', () => navEl.classList.remove('is-open'));

const installBannerMount = document.getElementById('install-banner-mount');
if (installBannerMount) {
  initInstallPrompt(installBannerMount, { appName: 'AI Prompt Eng' });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => {
    console.warn('service worker registration failed', err);
  });
}

const PUBLIC_PORTFOLIO_PREFIX = '#public/';
const CERT_PREFIX = '#cert/';

const startedOnPublicRoute = window.location.hash.startsWith(PUBLIC_PORTFOLIO_PREFIX);
const startedOnCertRoute = window.location.hash.startsWith(CERT_PREFIX);

// Reload on boundary crossing between public view modes and normal in-app navigation
window.addEventListener('hashchange', () => {
  if (
    startedOnPublicRoute || window.location.hash.startsWith(PUBLIC_PORTFOLIO_PREFIX) ||
    startedOnCertRoute || window.location.hash.startsWith(CERT_PREFIX)
  ) {
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
} else if (startedOnCertRoute) {
  const certId = window.location.hash.slice(CERT_PREFIX.length);
  signInButton.hidden = true;
  navEl.hidden = true;
  getCertificate(certId)
    .then((cert) => {
      renderPublicCertificateVerification(appEl, cert);
      if (cert) wireCertificateView(appEl, cert);
    })
    .catch((err) => {
      console.error('failed to verify certificate', err);
      appEl.innerHTML = '<p class="route-error">Couldn\'t verify this certificate. Please refresh.</p>';
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
    const [labRuns, portfolioEntries, milestones, certs] = await Promise.all([
      getLabRuns(currentMember.uid),
      getPortfolioEntries(currentMember.uid),
      getMilestones(currentMember.uid),
      getMemberCertificates(currentMember.uid),
    ]);
    if (isStale()) return;

    const stats = computeStats(labRuns, { totalLabs: TOTAL_LABS });
    renderDashboard(mountEl, { member: currentMember, stats });

    // Certificate banner on dashboard if issued
    if (certs.length > 0) {
      const bannerHtml = `
        <div class="dashboard-cert-banner">
          <div class="cert-banner-info">
            <span class="cert-banner-icon">🎓</span>
            <div>
              <h4>Official Credential Awarded — ${escapeHtml(certs[0].tier || '')}</h4>
              <p>You have earned an official verified certificate for completing the AI & Prompt Engineering curriculum.</p>
            </div>
          </div>
          <a href="#certificate" class="btn btn--primary btn--sm">View Certificate →</a>
        </div>
      `;
      mountEl.querySelector('.dashboard')?.insertAdjacentHTML('afterbegin', bannerHtml);
    }

    const badges = computeBadges({ labRuns, stats, portfolioEntries, milestones });
    const badgesHtml = renderBadgeGrid(badges);
    mountEl.insertAdjacentHTML('beforeend', badgesHtml);
  }

  async function renderRoadmapRoute(mountEl, isStale) {
    const [milestones, labRuns] = await Promise.all([
      getMilestones(currentMember.uid),
      getLabRuns(currentMember.uid),
    ]);
    if (isStale()) return;
    const milestonesByWeek = {};
    for (const m of milestones) milestonesByWeek[m.week] = m;

    const today = new Date().toISOString().slice(0, 10);
    const pacedWeeks = annotateWeekStatus(WEEKS, { weekStart: PROGRAM.weekStart, today });
    const gatedWeeks = computeWeekUnlocks(pacedWeeks, labRuns);

    const match = window.location.hash.match(/^#roadmap\/(\d+)$/);
    const requestedWeek = match ? gatedWeeks.find((w) => w.week === Number(match[1])) : null;

    if (match && !requestedWeek?.unlocked) {
      // Locked, or not a real week number -- back to the menu rather than
      // showing content a member hasn't earned access to yet.
      window.location.hash = '#roadmap';
      return;
    }

    if (requestedWeek) {
      renderWeekDetail(mountEl, requestedWeek, { milestonesByWeek });
      wireLabForms(mountEl, currentMember.uid);
      wireLessonStepper(mountEl);
      wireMilestoneForms(mountEl, {
        onSubmit: async (data) => {
          await submitMilestone(currentMember.uid, {
            ...data,
            memberName: currentMember.name,
          });
          router.refresh();
        },
      });
      return;
    }

    renderWeekMenu(mountEl, gatedWeeks);
  }

  async function renderLeaderboardRoute(mountEl, isStale) {
    // Reads the public-safe leaderboard/{uid} projection, never the full
    // members collection -- see firestore.rules: members/{uid} is
    // self-or-admin only, so every signed-in member being able to see this
    // route must not require reading anyone else's full profile/email.
    const entries = await getAllLeaderboardEntries();
    if (isStale()) return;

    const statsMap = Object.fromEntries(
      entries.map((e) => [e.uid, { xp: e.xp || 0, labsPassed: e.labsPassed || 0, streak: e.streak || 0 }])
    );
    const ranked = rankMembers(entries, statsMap);
    renderLeaderboard(mountEl, { rankedMembers: ranked, currentUserId: currentMember.uid });
  }

  async function renderJournalRoute(mountEl, isStale) {
    const [entries, labRuns] = await Promise.all([
      getJournalEntries(currentMember.uid),
      getLabRuns(currentMember.uid),
    ]);
    if (isStale()) return;

    const activityData = buildActivityMap({ labRuns, journalEntries: entries, daysCount: 70 });
    renderJournalView(mountEl, { entries, activityData });
    wireJournalForm(mountEl, async (entryData) => {
      await addJournalEntry(currentMember.uid, entryData);
      router.refresh();
    });
  }

  async function renderPortfolioRoute(mountEl, isStale) {
    const entries = await getPortfolioEntries(currentMember.uid);
    if (isStale()) return;
    const publicUrl = `${window.location.origin}${window.location.pathname}#public/${currentMember.uid}`;
    renderPortfolioManager(mountEl, entries, { publicUrl });
    wirePortfolioToggles(mountEl, currentMember.uid, () => router.refresh());
  }

  async function renderCertificateRoute(mountEl, isStale) {
    const [certs, labRuns, milestones] = await Promise.all([
      getMemberCertificates(currentMember.uid),
      getLabRuns(currentMember.uid),
      getMilestones(currentMember.uid),
    ]);
    if (isStale()) return;

    if (certs.length > 0) {
      renderCertificateView(mountEl, certs[0], { isOwner: true });
      wireCertificateView(mountEl, certs[0]);
    } else {
      const distinctLabs = new Set(labRuns.filter((r) => r.passed).map((r) => r.labId)).size;
      const capstoneMilestone = milestones.find((m) => m.week === 8);
      const isEligible = distinctLabs >= TOTAL_LABS && capstoneMilestone;

      mountEl.innerHTML = `
        <div class="certificate-view">
          <div class="empty-state">
            <div class="empty-state__icon">🎓</div>
            <h2>Certificate of Completion</h2>
            <p>Complete all 8 curriculum modules and submit your capstone assistant milestone to be awarded an official, verifiable GDGoC certificate.</p>
            
            <div class="cert-eligibility-card">
              <h3>Completion Requirements</h3>
              <div class="eligibility-item ${distinctLabs >= TOTAL_LABS ? 'is-complete' : ''}">
                <span>${distinctLabs >= TOTAL_LABS ? '✅' : '⏳'} 7 Graded Prompt Labs Passed</span>
                <span class="font-mono">${distinctLabs}/${TOTAL_LABS} Passed</span>
              </div>
              <div class="eligibility-item ${capstoneMilestone ? 'is-complete' : ''}">
                <span>${capstoneMilestone ? '✅' : '⏳'} Week 8 Capstone Assistant Submitted</span>
                <span>${capstoneMilestone ? (capstoneMilestone.status || 'Submitted') : 'Not Submitted'}</span>
              </div>
            </div>

            ${isEligible ? `
              <div class="eligibility-notice is-ready">
                <span>🎉 You have met all requirements! Your certificate will be reviewed and issued by a track lead shortly.</span>
              </div>
            ` : `
              <a href="#roadmap" class="btn btn--primary">Continue Curriculum Roadmap →</a>
            `}
          </div>
        </div>
      `;
    }
  }

  function renderProfileRoute(mountEl) {
    renderProfileView(mountEl, currentMember);
    const editBtn = mountEl.querySelector('#edit-profile-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        renderRegistrationForm(mountEl, currentMember);
        const submitBtn = mountEl.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Save Profile Changes';
        wireProfileForm(mountEl, async (formData) => {
          const updated = {
            ...currentMember,
            ...formData,
            updatedAt: Date.now(),
          };
          await setMember(currentMember.uid, updated);
          await syncLeaderboardProfile(currentMember.uid, {
            name: updated.name, level: updated.level, department: updated.department, careerGoal: updated.careerGoal,
          });
          currentMember = updated;
          signInButton.textContent = updated.name;
          renderProfileRoute(mountEl);
        });
      });
    }
  }

  function renderPlaygroundRoute(mountEl) {
    // Parse ?week=N from hash params e.g. #playground?week=3
    const hashParts = window.location.hash.split('?');
    const params = new URLSearchParams(hashParts[1] || '');
    const initialWeek = Number(params.get('week')) || 1;
    renderPlayground(mountEl, { initialWeek });
    wirePlayground(mountEl);
  }

  async function renderAdminRoute(mountEl, isStale) {
    const [allMembers, allMilestones, allCerts, allLabRuns] = await Promise.all([
      getAllMembers(),
      getAllMilestones(),
      getAllCertificates(),
      getAllLabRuns(),
    ]);
    if (isStale()) return;

    const stats = computeCohortStats(allMembers, allMilestones);
    renderAdminDashboard(mountEl, { stats, members: allMembers, milestones: allMilestones, certificates: allCerts, allLabRuns, totalLabs: TOTAL_LABS });
    wireAdminDashboard(mountEl, {
      members: allMembers,
      allLabRuns,
      onReviewMilestone: async ({ submissionId, status, feedback }) => {
        await reviewMilestone(submissionId, {
          status,
          feedback,
          reviewerName: currentMember.name,
        });
        router.refresh();
      },
      onIssueCertificate: async (certData) => {
        await issueCertificate(certData);
        router.refresh();
      },
      onExportCsv: () => {
        const csvContent = exportMembersToCsv(allMembers);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gdgoc-ai-roster-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  async function setupRouter() {
    const adminNav = document.getElementById('nav-admin');
    const isAdmin = await checkIsAdmin(currentMember.uid);
    if (adminNav) adminNav.hidden = !isAdmin;

    const routes = {
      dashboard: renderDashboardRoute,
      roadmap: renderRoadmapRoute,
      playground: renderPlaygroundRoute,
      leaderboard: renderLeaderboardRoute,
      journal: renderJournalRoute,
      portfolio: renderPortfolioRoute,
      certificate: renderCertificateRoute,
      profile: renderProfileRoute,
    };
    if (isAdmin) {
      routes.admin = renderAdminRoute;
    }

    if (!router) {
      router = initRouter(appEl, routes, { fallback: 'dashboard', navEl });
    } else {
      router.refresh();
    }
  }

  onAuthChange(async (member) => {
    if (!member) return;
    const memberDoc = await getMember(member.uid);

    if (!memberDoc?.registered) {
      signInButton.textContent = member.name || 'Member';
      signInButton.hidden = false;
      navEl.hidden = true;
      renderRegistrationForm(appEl, { ...member, ...memberDoc });
      wireProfileForm(appEl, async (formData) => {
        const fullData = {
          ...member,
          ...formData,
          registered: true,
          registeredAt: memberDoc?.registeredAt || Date.now(),
        };
        await setMember(member.uid, fullData);
        await syncLeaderboardProfile(member.uid, {
          name: fullData.name, level: fullData.level, department: fullData.department, careerGoal: fullData.careerGoal,
        });
        currentMember = fullData;
        signInButton.textContent = fullData.name;
        navEl.hidden = false;
        await setupRouter();
        if (window.location.hash !== '#dashboard') {
          window.location.hash = '#dashboard';
        } else {
          router.refresh();
        }
      });
      return;
    }

    currentMember = { ...member, ...memberDoc };
    signInButton.textContent = currentMember.name;
    signInButton.hidden = false;
    navEl.hidden = false;
    setupRouter();
  });
}
