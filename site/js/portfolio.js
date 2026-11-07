import { escapeHtml } from './util.js';
import { setPortfolioPublished } from './store.js';

export function renderPortfolioManager(mountEl, entries, { publicUrl } = {}) {
  const shareBlock = publicUrl
    ? `
      <div class="portfolio-share-card">
        <div class="portfolio-share-card__info">
          <span class="share-label">Public Portfolio Link</span>
          <a class="share-url" href="${escapeHtml(publicUrl)}" target="_blank" rel="noopener">${escapeHtml(publicUrl)}</a>
        </div>
        <button class="btn btn--secondary btn--sm" onclick="navigator.clipboard.writeText('${escapeHtml(publicUrl)}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy Link', 2000)">Copy Link</button>
      </div>
    `
    : '';

  if (entries.length === 0) {
    mountEl.innerHTML = `
      ${shareBlock}
      <div class="empty-state">
        <div class="empty-state__icon">📁</div>
        <h3>No Portfolio Entries Yet</h3>
        <p>You have no passing lab submissions yet — pass a lab to start building your portfolio.</p>
        <a href="#roadmap" class="btn btn--primary">Go to Roadmap</a>
      </div>
    `;
    return;
  }

  mountEl.innerHTML = `
    ${shareBlock}
    <div class="portfolio-header-bar">
      <div>
        <h2>Your Prompt Portfolio</h2>
        <p class="portfolio-header-bar__sub">Select which passing prompts you want visible on your public portfolio page.</p>
      </div>
      <span class="badge badge--glow">${entries.length} ${entries.length === 1 ? 'Entry' : 'Entries'}</span>
    </div>

    <div class="portfolio-list">
      ${entries
        .sort((a, b) => a.week - b.week)
        .map((entry) => `
          <div class="portfolio-card">
            <div class="portfolio-card__head">
              <div class="portfolio-card__badges">
                <span class="week-pill">Week ${entry.week}</span>
                <span class="score-badge">${Math.round(entry.rubricScore * 100)}% Pass</span>
                <span class="pill ${entry.published ? 'pill--published' : 'pill--unpublished'}">${entry.published ? 'Published' : 'Unpublished'}</span>
              </div>
              <div class="portfolio-row__actions">
                <button class="btn ${entry.published ? 'btn--secondary' : 'btn--primary'} btn--sm" data-toggle-publish data-week="${entry.week}">
                  ${entry.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>

            <div class="portfolio-card__body">
              <div class="code-preview">
                <div class="code-preview__header">
                  <span class="code-preview__label">Verified Prompt</span>
                </div>
                <pre class="portfolio-row__prompt"><code>${escapeHtml(entry.promptText)}</code></pre>
              </div>

              ${entry.outputSnippet ? `
                <div class="output-preview">
                  <div class="output-preview__header">
                    <span class="output-preview__label">Model Output</span>
                  </div>
                  <pre class="portfolio-row__output"><code>${escapeHtml(entry.outputSnippet)}</code></pre>
                </div>
              ` : ''}
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
    mountEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🔒</div>
        <h3>No Published Prompts</h3>
        <p>This member hasn't published any portfolio entries yet.</p>
      </div>
    `;
    return;
  }
  mountEl.innerHTML = `
    <div class="public-portfolio-header">
      <div class="brand-logo" aria-hidden="true">
        <span class="brand-dot brand-dot--blue"></span>
        <span class="brand-dot brand-dot--red"></span>
        <span class="brand-dot brand-dot--yellow"></span>
        <span class="brand-dot brand-dot--green"></span>
      </div>
      <h2>Verified Prompt Portfolio</h2>
      <p class="public-portfolio-sub">Curated and server-validated system prompts from the GDGoC AI Prompt Engineering Track.</p>
    </div>

    <div class="portfolio-list">
      ${entries
        .sort((a, b) => a.week - b.week)
        .map((entry) => `
          <div class="portfolio-card portfolio-card--public">
            <div class="portfolio-card__head">
              <div class="portfolio-card__badges">
                <span class="week-pill">Week ${entry.week}</span>
                <span class="score-badge">${Math.round(entry.rubricScore * 100)}% Pass</span>
              </div>
            </div>

            <div class="portfolio-card__body">
              <div class="code-preview">
                <div class="code-preview__header">
                  <span class="code-preview__label">System Prompt</span>
                </div>
                <pre class="portfolio-row__prompt"><code>${escapeHtml(entry.promptText)}</code></pre>
              </div>

              ${entry.outputSnippet ? `
                <div class="output-preview">
                  <div class="output-preview__header">
                    <span class="output-preview__label">Sample Model Output</span>
                  </div>
                  <pre class="portfolio-row__output"><code>${escapeHtml(entry.outputSnippet)}</code></pre>
                </div>
              ` : ''}
            </div>
          </div>
        `)
        .join('')}
    </div>
  `;
}
