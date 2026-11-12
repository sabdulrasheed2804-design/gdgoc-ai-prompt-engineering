import { escapeHtml } from './util.js';
import { MILESTONE_XP } from './stats.js';

export function validateMilestone(data) {
  const errors = {};
  const urlPattern = /^https?:\/\/.+/i;

  if (!data.repoUrl || !urlPattern.test(data.repoUrl.trim())) {
    errors.repoUrl = 'Valid repository URL is required (e.g. https://github.com/...)';
  }

  if (data.demoUrl && !urlPattern.test(data.demoUrl.trim())) {
    errors.demoUrl = 'Demo URL must start with http:// or https://';
  }

  if (!data.notes || typeof data.notes !== 'string' || !data.notes.trim()) {
    errors.notes = 'Please include a brief note explaining what you built or changed';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function renderMilestoneBox({ week, milestoneDesc, submission }) {
  const hasSubmission = Boolean(submission);
  const status = submission?.status || 'unsubmitted';

  let statusBadge = '';
  if (status === 'pending') {
    statusBadge = '<span class="status-pill status-pill--pending">⏳ Pending Lead Review</span>';
  } else if (status === 'approved') {
    statusBadge = '<span class="status-pill status-pill--approved">✅ Milestone Approved</span>';
  } else if (status === 'excellent') {
    statusBadge = '<span class="status-pill status-pill--excellent">🌟 Excellent Milestone</span>';
  } else if (status === 'needs_work') {
    statusBadge = '<span class="status-pill status-pill--needs-work">⚠️ Revisions Requested</span>';
  }

  return `
    <div class="week-card__milestone-box" data-milestone-box data-week="${week}">
      <div class="milestone-box__head">
        <div class="milestone-box__title-row">
          <span class="milestone-icon">🎯</span>
          <span class="milestone-box__heading">Weekly Capstone Milestone</span>
        </div>
        ${statusBadge}
      </div>

      <p class="week-card__milestone"><strong>Milestone:</strong> ${escapeHtml(milestoneDesc)}</p>
      <p class="milestone-box__xp-note">
        ${submission?.xpAwarded
          ? `✨ <strong>+${Number(submission.xpAwarded)} XP</strong> earned for this milestone.`
          : `Optional &mdash; it doesn't gate next week, but earns <strong>+${MILESTONE_XP.approved} XP</strong> once a lead approves it (<strong>+${MILESTONE_XP.excellent} XP</strong> if marked excellent).`}
      </p>

      ${hasSubmission ? `
        <div class="milestone-submission-summary">
          <div class="submission-meta">
            <span class="meta-label">Repo:</span>
            <a href="${escapeHtml(submission.repoUrl)}" target="_blank" rel="noopener">${escapeHtml(submission.repoUrl)}</a>
          </div>
          ${submission.demoUrl ? `
            <div class="submission-meta">
              <span class="meta-label">Demo:</span>
              <a href="${escapeHtml(submission.demoUrl)}" target="_blank" rel="noopener">${escapeHtml(submission.demoUrl)}</a>
            </div>
          ` : ''}
          <div class="submission-notes">
            <span class="meta-label">Notes:</span>
            <p>${escapeHtml(submission.notes)}</p>
          </div>

          ${submission.feedback ? `
            <div class="mentor-feedback mentor-feedback--${status}">
              <strong>Review Feedback (by ${escapeHtml(submission.reviewerName || 'Lead')}):</strong>
              <p>${escapeHtml(submission.feedback)}</p>
            </div>
          ` : ''}

          ${status === 'needs_work' || status === 'pending' ? `
            <button class="btn btn--secondary btn--sm" data-toggle-resubmit data-week="${week}">
              ${status === 'needs_work' ? 'Resubmit Revisions' : 'Edit Submission'}
            </button>
          ` : ''}
        </div>
      ` : ''}

      <form class="milestone-form ${hasSubmission ? 'milestone-form--hidden' : ''}" data-milestone-form data-week="${week}">
        <div class="form-group">
          <label>Project Repository URL *</label>
          <input type="url" name="repoUrl" value="${submission?.repoUrl ? escapeHtml(submission.repoUrl) : ''}" placeholder="https://github.com/username/project" required />
          <span class="form-error" data-error="repoUrl"></span>
        </div>

        <div class="form-group">
          <label>Live Demo / Video Link (optional)</label>
          <input type="url" name="demoUrl" value="${submission?.demoUrl ? escapeHtml(submission.demoUrl) : ''}" placeholder="https://demo.app or Loom video" />
          <span class="form-error" data-error="demoUrl"></span>
        </div>

        <div class="form-group">
          <label>Submission Notes / What was built *</label>
          <textarea name="notes" rows="3" placeholder="Briefly explain your design decisions and test results..." required>${submission?.notes ? escapeHtml(submission.notes) : ''}</textarea>
          <span class="form-error" data-error="notes"></span>
        </div>

        <div class="form-actions">
          <button class="btn btn--primary btn--sm" type="submit">Submit Milestone for Review</button>
        </div>
      </form>
    </div>
  `;
}

export function wireMilestoneForms(mountEl, { onSubmit }) {
  // Wire toggle resubmit buttons
  mountEl.querySelectorAll('[data-toggle-resubmit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const week = btn.dataset.week;
      const box = mountEl.querySelector(`[data-milestone-box][data-week="${week}"]`);
      if (box) {
        const form = box.querySelector('[data-milestone-form]');
        if (form) {
          form.classList.toggle('milestone-form--hidden');
          btn.textContent = form.classList.contains('milestone-form--hidden') ? 'Edit Submission' : 'Hide Form';
        }
      }
    });
  });

  // Wire form submits
  mountEl.querySelectorAll('[data-milestone-form]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const week = Number(form.dataset.week);
      const formData = new FormData(form);
      const data = {
        week,
        repoUrl: formData.get('repoUrl')?.toString().trim() || '',
        demoUrl: formData.get('demoUrl')?.toString().trim() || '',
        notes: formData.get('notes')?.toString().trim() || '',
      };

      // Clear errors
      form.querySelectorAll('[data-error]').forEach((el) => {
        el.textContent = '';
        el.hidden = true;
      });

      const validation = validateMilestone(data);
      if (!validation.valid) {
        for (const [field, msg] of Object.entries(validation.errors)) {
          const errEl = form.querySelector(`[data-error="${field}"]`);
          if (errEl) {
            errEl.textContent = msg;
            errEl.hidden = false;
          }
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await onSubmit(data);
      } catch (err) {
        console.error('Milestone submission failed', err);
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}
