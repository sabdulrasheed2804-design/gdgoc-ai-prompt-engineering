import { escapeHtml } from './util.js';

export function renderDashboard(mountEl, { member, stats }) {
  const name = member.name ? escapeHtml(member.name) : 'there';
  mountEl.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-hero">
        <div class="dashboard-hero__content">
          <span class="badge badge--glow">AI & Prompt Engineering Track</span>
          <h2>Welcome back, ${name} 👋</h2>
          <p class="dashboard-hero__sub">You're making steady progress toward building your capstone assistant and earning your certificate.</p>
        </div>
        <div class="dashboard-hero__actions">
          <a class="btn btn--primary" href="#roadmap">Continue the roadmap</a>
          <a class="btn btn--secondary" href="#portfolio">View Portfolio</a>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-section__header">
          <span class="progress-section__title">Semester Progress</span>
          <span class="progress-section__pct">${stats.progressPct}% Completed</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width: ${Math.min(100, Math.max(0, stats.progressPct))}%"></div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card stat-card--labs">
          <div class="stat-card__icon">🧪</div>
          <div class="stat-card__data">
            <span class="stat-card__value">${stats.labsPassed}/${stats.totalLabs}</span>
            <span class="stat-card__label">Labs passed (${stats.progressPct}%)</span>
          </div>
        </div>
        <div class="stat-card stat-card--xp">
          <div class="stat-card__icon">⭐</div>
          <div class="stat-card__data">
            <span class="stat-card__value">${stats.xp}</span>
            <span class="stat-card__label">Total XP</span>
          </div>
        </div>
        <div class="stat-card stat-card--streak">
          <div class="stat-card__icon">🔥</div>
          <div class="stat-card__data">
            <span class="stat-card__value">${stats.streak}</span>
            <span class="stat-card__label">Day streak</span>
          </div>
        </div>
      </div>

      <div class="dashboard-shortcuts">
        <div class="shortcut-card">
          <div class="shortcut-card__icon">📖</div>
          <div class="shortcut-card__info">
            <h3>Interactive Roadmap</h3>
            <p>Access weekly readings, hands-on prompt labs, and self-quizzes.</p>
          </div>
          <a href="#roadmap" class="shortcut-card__link">Go to Roadmap →</a>
        </div>
        <div class="shortcut-card">
          <div class="shortcut-card__icon">💼</div>
          <div class="shortcut-card__info">
            <h3>Prompt Portfolio</h3>
            <p>Publish and share your top-scoring prompts with employers.</p>
          </div>
          <a href="#portfolio" class="shortcut-card__link">Manage Portfolio →</a>
        </div>
      </div>
    </div>
  `;
}
