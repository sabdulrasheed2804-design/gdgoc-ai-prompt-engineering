import { escapeHtml } from './util.js';

export function renderDashboard(mountEl, { member, stats }) {
  const name = member.name ? escapeHtml(member.name) : 'there';
  mountEl.innerHTML = `
    <div class="dashboard">
      <h2>Welcome back, ${name}</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-card__value">${stats.labsPassed}/${stats.totalLabs}</span>
          <span class="stat-card__label">Labs passed (${stats.progressPct}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">${stats.xp}</span>
          <span class="stat-card__label">XP</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__value">${stats.streak}</span>
          <span class="stat-card__label">Day streak</span>
        </div>
      </div>
      <a class="btn btn--primary" href="#roadmap">Continue the roadmap</a>
    </div>
  `;
}
