import { escapeHtml } from './util.js';

export function buildActivityMap({ labRuns = [], journalEntries = [], daysCount = 70 } = {}) {
  const counts = {};

  for (const r of labRuns) {
    if (r.timestamp) {
      const d = r.timestamp.slice(0, 10);
      counts[d] = (counts[d] || 0) + 1;
    }
  }

  for (const j of journalEntries) {
    const d = j.date || (j.createdAt ? new Date(j.createdAt).toISOString().slice(0, 10) : null);
    if (d) {
      counts[d] = (counts[d] || 0) + 1;
    }
  }

  const result = [];
  const now = new Date();

  for (let i = daysCount - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const dateStr = day.toISOString().slice(0, 10);
    const count = counts[dateStr] || 0;

    let level = 0;
    if (count === 1) level = 1;
    else if (count >= 2 && count <= 3) level = 2;
    else if (count >= 4) level = 3;

    result.push({
      date: dateStr,
      count,
      level,
    });
  }

  return result;
}

export function validateJournalEntry(data) {
  const errors = {};
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Title or topic is required';
  }
  if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
    errors.content = 'Reflection notes are required';
  }
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function renderJournalView(mountEl, { entries = [], activityData = [] }) {
  const totalEntries = entries.length;
  const activeDayCount = activityData.filter((d) => d.count > 0).length;

  mountEl.innerHTML = `
    <div class="journal-container">
      <div class="journal-header">
        <div>
          <div class="site-header__title-row">
            <h2>Learning Journal & Activity</h2>
            <span class="badge badge--cluster">Daily Reflections</span>
          </div>
          <p class="journal-sub">Document your prompt engineering insights, breakthroughs, model quirks, and daily progress.</p>
        </div>
      </div>

      <!-- Activity Heatmap Section -->
      <div class="activity-section">
        <div class="activity-section__head">
          <h3>Consistency & Activity Heatmap</h3>
          <span class="badge badge--glow">${activeDayCount} Active Day${activeDayCount === 1 ? '' : 's'}</span>
        </div>
        <div class="activity-heatmap" data-activity-heatmap>
          <div class="heatmap-grid">
            ${activityData.map((d) => `
              <div class="heatmap-cell heatmap-cell--${d.level}" title="${d.count} activities on ${d.date}"></div>
            `).join('')}
          </div>
          <div class="heatmap-legend">
            <span>Less</span>
            <div class="heatmap-cell heatmap-cell--0"></div>
            <div class="heatmap-cell heatmap-cell--1"></div>
            <div class="heatmap-cell heatmap-cell--2"></div>
            <div class="heatmap-cell heatmap-cell--3"></div>
            <span>More</span>
          </div>
        </div>
      </div>

      <div class="journal-main-grid">
        <!-- New Entry Form -->
        <div class="journal-form-card">
          <h3>Write Today's Reflection</h3>
          <form class="journal-form" data-journal-form>
            <div class="form-group">
              <label>Topic / Technique Tested *</label>
              <input type="text" name="title" placeholder="e.g. Chain-of-Thought on Math Word Problems" required />
              <span class="form-error" data-error="title"></span>
            </div>

            <div class="form-group">
              <label>What did you learn? Key takeaways & model behaviors *</label>
              <textarea name="content" rows="4" placeholder="I noticed that when asking the model to show intermediate calculations..." required></textarea>
              <span class="form-error" data-error="content"></span>
            </div>

            <div class="form-group">
              <label>Edge cases, surprises, or prompt variations (optional)</label>
              <textarea name="edgeCases" rows="2" placeholder="Testing zero-shot vs few-shot on tricky edge cases..."></textarea>
            </div>

            <button class="btn btn--primary" type="submit">Save Reflection</button>
          </form>
        </div>

        <!-- Past Entries Timeline -->
        <div class="journal-timeline-section">
          <h3>Past Reflections (${totalEntries})</h3>
          ${entries.length === 0 ? `
            <div class="empty-state">
              <div class="empty-state__icon">📓</div>
              <h4>No Reflections Logged Yet</h4>
              <p>Keep a daily log of what you discover while working on the prompt engineering labs!</p>
            </div>
          ` : `
            <div class="journal-timeline">
              ${entries.map((entry) => `
                <div class="journal-entry-card">
                  <div class="entry-head">
                    <h4>${escapeHtml(entry.title)}</h4>
                    <span class="entry-date">${escapeHtml(entry.date || new Date(entry.createdAt).toLocaleDateString())}</span>
                  </div>
                  <div class="entry-body">
                    <p>${escapeHtml(entry.content)}</p>
                    ${entry.edgeCases ? `
                      <div class="entry-edge-cases">
                        <strong>Notes & Edge Cases:</strong>
                        <p>${escapeHtml(entry.edgeCases)}</p>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    </div>
  `;
}

export function wireJournalForm(mountEl, { onAddEntry }) {
  const form = mountEl.querySelector('[data-journal-form]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      title: formData.get('title')?.toString().trim() || '',
      content: formData.get('content')?.toString().trim() || '',
      edgeCases: formData.get('edgeCases')?.toString().trim() || '',
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
    };

    form.querySelectorAll('[data-error]').forEach((el) => {
      el.textContent = '';
      el.hidden = true;
    });

    const validation = validateJournalEntry(data);
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
      await onAddEntry(data);
      form.reset();
    } catch (err) {
      console.error('Failed to save reflection', err);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

