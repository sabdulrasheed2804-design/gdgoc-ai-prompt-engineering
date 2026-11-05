import { escapeHtml } from './util.js';
import { setPortfolioPublished } from './store.js';

export function renderPortfolioManager(mountEl, entries) {
  if (entries.length === 0) {
    mountEl.innerHTML = '<p class="empty-state">You have no passing lab submissions yet — pass a lab to start building your portfolio.</p>';
    return;
  }
  mountEl.innerHTML = `
    <div class="portfolio-list">
      ${entries
        .sort((a, b) => a.week - b.week)
        .map((entry) => `
          <div class="portfolio-row">
            <div>
              <strong>Week ${entry.week}</strong>
              <span class="portfolio-row__score">${Math.round(entry.rubricScore * 100)}%</span>
              <p class="portfolio-row__prompt">${escapeHtml(entry.promptText)}</p>
            </div>
            <div class="portfolio-row__actions">
              <span class="pill ${entry.published ? 'pill--published' : 'pill--unpublished'}">${entry.published ? 'Published' : 'Unpublished'}</span>
              <button class="btn btn--primary" data-toggle-publish data-week="${entry.week}">
                ${entry.published ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
        `)
        .join('')}
    </div>
  `;
}

export async function toggleAndReport({ setPortfolioPublished, uid, week, nextPublished }) {
  try {
    await setPortfolioPublished(uid, week, nextPublished);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function wirePortfolioToggles(mountEl, uid, onToggled) {
  mountEl.querySelectorAll('[data-toggle-publish]').forEach((button) => {
    button.addEventListener('click', async () => {
      const week = Number(button.dataset.week);
      const nextPublished = button.textContent.trim() === 'Publish';
      button.disabled = true;
      const result = await toggleAndReport({ setPortfolioPublished, uid, week, nextPublished });
      if (!result.ok) {
        console.error('failed to update portfolio publish state', result.error);
        button.disabled = false;
        return;
      }
      onToggled?.();
    });
  });
}

export function renderPublicPortfolio(mountEl, entries) {
  if (entries.length === 0) {
    mountEl.innerHTML = '<p class="empty-state">This member hasn\'t published any portfolio entries yet.</p>';
    return;
  }
  mountEl.innerHTML = `
    <div class="portfolio-list">
      ${entries
        .sort((a, b) => a.week - b.week)
        .map((entry) => `
          <div class="portfolio-row">
            <strong>Week ${entry.week}</strong>
            <span class="portfolio-row__score">${Math.round(entry.rubricScore * 100)}%</span>
            <p class="portfolio-row__prompt">${escapeHtml(entry.promptText)}</p>
            <p class="portfolio-row__output">${escapeHtml(entry.outputSnippet)}</p>
          </div>
        `)
        .join('')}
    </div>
  `;
}
