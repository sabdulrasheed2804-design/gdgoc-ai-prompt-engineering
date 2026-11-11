import { escapeHtml } from './util.js';

const DISMISS_KEY = 'installBannerDismissedAt';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function detectInstallPlatform(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export function shouldShowInstallBanner({ platform, isStandalone, dismissedAt, now = Date.now() }) {
  if (platform === 'other') return false;
  if (isStandalone) return false;
  if (!dismissedAt) return true;
  return now - dismissedAt > SNOOZE_MS;
}

export function renderInstallBanner(platform, appName) {
  const name = escapeHtml(appName);
  const instructions = platform === 'ios'
    ? `Tap <strong>Share</strong> <span aria-hidden="true">⬆️</span>, then <strong>Add to Home Screen</strong>.`
    : `Add ${name} to your home screen for quick, full-screen access.`;

  return `
    <div class="install-banner" data-install-banner>
      <span class="install-banner__icon" aria-hidden="true">📲</span>
      <div class="install-banner__body">
        <strong>Install ${name}</strong>
        <p>${instructions}</p>
      </div>
      ${platform === 'android' ? '<button type="button" class="btn btn--primary btn--sm" data-install-action>Install</button>' : ''}
      <button type="button" class="install-banner__dismiss" data-install-dismiss aria-label="Dismiss">✕</button>
    </div>
  `;
}

// Wires the real browser APIs (localStorage, matchMedia, the
// beforeinstallprompt event) around the pure functions above. Kept
// separate so the decision logic can be unit tested without a DOM.
export function initInstallPrompt(mountEl, { appName = 'this app', userAgent = navigator.userAgent } = {}) {
  const platform = detectInstallPlatform(userAgent);
  if (platform === 'other') return;

  const isStandalone = Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  );

  let dismissedAt = null;
  try {
    dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || null;
  } catch {
    // localStorage unavailable (private browsing, etc.) -- just don't persist dismissal
  }

  if (!shouldShowInstallBanner({ platform, isStandalone, dismissedAt })) return;

  let deferredPrompt = null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // see above
    }
    mountEl.querySelector('[data-install-banner]')?.remove();
  }

  function show() {
    if (mountEl.querySelector('[data-install-banner]')) return;
    mountEl.insertAdjacentHTML('afterbegin', renderInstallBanner(platform, appName));
    const banner = mountEl.querySelector('[data-install-banner]');
    banner.querySelector('[data-install-dismiss]').addEventListener('click', dismiss);
    banner.querySelector('[data-install-action]')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      dismiss();
    });
  }

  if (platform === 'android') {
    // Chrome only shows the install option once it's fired this event --
    // capture it instead of letting Chrome show its own mini-infobar, so
    // the banner looks consistent with the rest of the page.
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      show();
    });
  } else {
    show();
  }

  window.addEventListener('appinstalled', dismiss);
}
