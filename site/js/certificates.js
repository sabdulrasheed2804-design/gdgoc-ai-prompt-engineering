import { escapeHtml } from './util.js';
import { drawCertificate, exportCanvasToPng } from './media.js';

export function determineCertificateTier({ stats = {}, milestones = [], leaderboardRank = null } = {}) {
  const labsPassed = stats.labsPassed || 0;
  const totalLabs = stats.totalLabs || 7;

  // Must pass all 7 curriculum labs to earn completion certificate
  if (labsPassed < totalLabs) {
    return null;
  }

  const hasExcellentMilestone = milestones.some((m) => m.status === 'excellent');
  const isTop10 = leaderboardRank !== null && leaderboardRank <= 10;

  if (isTop10 || hasExcellentMilestone) {
    return 'Honors';
  }

  const hasApprovedMilestone = milestones.some((m) => m.status === 'approved');
  if (hasApprovedMilestone || (stats.streak || 0) >= 5) {
    return 'Distinction';
  }

  return 'Completion';
}

export function buildLinkedInCertUrl({
  certId, recipientName, tier, issueDate,
  // GitHub Pages serves project sites from a /<repo-name>/ subpath, so the
  // base URL needs origin+pathname, not origin alone (an origin-only link
  // 404s once deployed) -- matches the #cert link built at render time below.
  baseUrl = (typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://sabdulrasheed2804-design.github.io/gdgoc-ai-prompt-engineering/'),
}) {
  const orgName = encodeURIComponent('Google Developer Groups on Campus');
  const certName = encodeURIComponent(`AI & Prompt Engineering — ${tier}`);
  const certUrl = encodeURIComponent(`${baseUrl}#cert/${certId}`);
  const certIdParam = encodeURIComponent(certId);

  return `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${certName}&organizationName=${orgName}&certId=${certIdParam}&certUrl=${certUrl}`;
}

export function renderCertificateView(mountEl, cert, { verificationUrl = '', isOwner = true } = {}) {
  const recipientName = escapeHtml(cert.recipientName || 'Member');
  const tier = escapeHtml(cert.tier || 'Completion');
  const certId = escapeHtml(cert.certId || 'GDGOC-AI');
  const issueDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent';

  const linkedinUrl = buildLinkedInCertUrl({
    certId: cert.certId,
    recipientName: cert.recipientName,
    tier: cert.tier,
    issueDate,
  });

  mountEl.innerHTML = `
    <div class="certificate-view">
      <div class="certificate-header">
        <div>
          <div class="site-header__title-row">
            <h2>Official Credential</h2>
            <span class="badge badge--cluster">Verified · ${tier}</span>
          </div>
          <p class="certificate-sub">Issued by Google Developer Groups on Campus for mastery in server-evaluated prompt engineering.</p>
        </div>
        <div class="certificate-actions">
          <button class="btn btn--primary" id="btn-download-cert">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            <span>Download PNG</span>
          </button>
          <button class="btn btn--secondary" id="btn-copy-cert-link">
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg>
            <span>Share Link</span>
          </button>
          ${isOwner ? `
            <a class="btn btn--secondary" href="${linkedinUrl}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.761-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              <span>Add to LinkedIn</span>
            </a>
          ` : ''}
        </div>
      </div>

      <div class="certificate-canvas-wrap">
        <canvas class="certificate-canvas" id="cert-canvas" width="1920" height="1080"></canvas>
      </div>

      <div class="certificate-meta-bar">
        <div class="cert-meta-item">
          <span class="cert-meta-label">Credential ID</span>
          <span class="cert-meta-value font-mono">${certId}</span>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">Recipient</span>
          <span class="cert-meta-value">${recipientName}</span>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">Issue Date</span>
          <span class="cert-meta-value">${issueDate}</span>
        </div>
        <div class="cert-meta-item">
          <span class="cert-meta-label">Verification Status</span>
          <span class="cert-meta-value text-green">✓ Valid Authenticated Credential</span>
        </div>
      </div>
    </div>
  `;
}

export function renderPublicCertificateVerification(mountEl, cert) {
  if (!cert) {
    mountEl.innerHTML = `
      <div class="verification-not-found">
        <div class="empty-state__icon">⚠️</div>
        <h2>Certificate Not Found</h2>
        <p>The requested certificate identifier could not be verified in the GDGoC records.</p>
        <a href="#roadmap" class="btn btn--primary">Visit Learning Track</a>
      </div>
    `;
    return;
  }

  const recipientName = escapeHtml(cert.recipientName || 'Member');
  const trackName = escapeHtml(cert.trackName || 'AI & Prompt Engineering Track');
  const tier = escapeHtml(cert.tier || 'Completion');
  const certId = escapeHtml(cert.certId || 'GDGOC-AI');
  const faculty = escapeHtml(cert.faculty || 'Engineering & Computing');
  const issueDate = cert.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recent';

  const recipientUid = cert.recipientUid || '';

  mountEl.innerHTML = `
    <div class="public-cert-container">
      <div class="verification-badge-card">
        <div class="verification-status">
          <span class="verification-icon">✓</span>
          <div>
            <h3>Official Verified Credential</h3>
            <p>Verified on the Google Developer Groups on Campus registry.</p>
          </div>
        </div>
      </div>

      <div class="public-cert-card">
        <div class="public-cert-details">
          <div class="cert-detail-header">
            <div class="brand-logo" aria-hidden="true">
              <span class="brand-dot brand-dot--blue"></span>
              <span class="brand-dot brand-dot--red"></span>
              <span class="brand-dot brand-dot--yellow"></span>
              <span class="brand-dot brand-dot--green"></span>
            </div>
            <div>
              <h2 class="public-cert-recipient">${recipientName}</h2>
              <p class="public-cert-subtitle">${trackName} · ${faculty}</p>
            </div>
          </div>

          <div class="public-cert-grid">
            <div class="cert-prop">
              <span class="cert-prop__label">Achievement Tier</span>
              <span class="cert-prop__val font-bold text-blue">${tier}</span>
            </div>
            <div class="cert-prop">
              <span class="cert-prop__label">Credential ID</span>
              <span class="cert-prop__val font-mono">${certId}</span>
            </div>
            <div class="cert-prop">
              <span class="cert-prop__label">Issue Date</span>
              <span class="cert-prop__val">${issueDate}</span>
            </div>
            <div class="cert-prop">
              <span class="cert-prop__label">Issuer</span>
              <span class="cert-prop__val">GDGoC AI Cluster</span>
            </div>
          </div>

          <div class="public-cert-footer-links">
            ${recipientUid ? `<a href="#public/${escapeHtml(recipientUid)}" class="btn btn--secondary">View Student's Prompt Portfolio →</a>` : ''}
            <button class="btn btn--primary" id="btn-download-cert">Download Certificate PNG</button>
          </div>
        </div>

        <div class="certificate-canvas-wrap">
          <canvas class="certificate-canvas" id="cert-canvas" width="1920" height="1080"></canvas>
        </div>
      </div>
    </div>
  `;
}

export function wireCertificateView(mountEl, cert) {
  const canvas = mountEl.querySelector('#cert-canvas');
  if (canvas && cert) {
    drawCertificate(canvas, {
      recipientName: cert.recipientName,
      trackName: cert.trackName,
      tier: cert.tier,
      certId: cert.certId,
      issueDate: cert.issuedAt
        ? new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : undefined,
      faculty: cert.faculty,
    });
  }

  const downloadBtn = mountEl.querySelector('#btn-download-cert');
  if (downloadBtn && canvas) {
    downloadBtn.addEventListener('click', () => {
      const filename = `GDGoC-${cert.certId || 'Certificate'}.png`;
      exportCanvasToPng(canvas, filename);
    });
  }

  const copyBtn = mountEl.querySelector('#btn-copy-cert-link');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const url = `${window.location.origin}${window.location.pathname}#cert/${cert.certId}`;
      try {
        await navigator.clipboard.writeText(url);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>✓ Copied Link!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      } catch {
        prompt('Copy your certificate verification link:', url);
      }
    });
  }
}
