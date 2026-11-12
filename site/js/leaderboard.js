import { escapeHtml } from './util.js';

export function rankMembers(members = [], statsMap = {}) {
  const decorated = members.map((m) => {
    const s = statsMap[m.uid] || { xp: 0, labsPassed: 0, streak: 0 };
    return {
      uid: m.uid,
      name: m.name || 'Member',
      department: m.department || '',
      level: m.level || '',
      careerGoal: m.careerGoal || 'Track Member',
      xp: s.xp || 0,
      labsPassed: s.labsPassed || 0,
      streak: s.streak || 0,
    };
  });

  decorated.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    if (b.labsPassed !== a.labsPassed) return b.labsPassed - a.labsPassed;
    return b.streak - a.streak;
  });

  return decorated.map((item, index) => ({
    rank: index + 1,
    ...item,
  }));
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const ORDINALS = { 1: '1st', 2: '2nd', 3: '3rd' };

function describeMember(m) {
  const parts = [`🧪 ${m.labsPassed} ${m.labsPassed === 1 ? 'lab' : 'labs'}`];
  if (m.streak > 0) parts.push(`🔥 ${m.streak}-day streak`);
  if (m.careerGoal) parts.push(escapeHtml(m.careerGoal));
  return parts.join(' · ');
}

function renderPodiumStep(m, currentUserId) {
  const current = m.uid === currentUserId ? 'podium-step--current' : '';
  return `
    <div class="podium-step podium-step--${m.rank} ${current}" aria-label="${ORDINALS[m.rank]} place: ${escapeHtml(m.name)}, ${m.xp} XP">
      <div class="podium-avatar">
        ${escapeHtml(m.name.charAt(0).toUpperCase())}
        <span class="podium-medal" aria-hidden="true">${MEDALS[m.rank]}</span>
      </div>
      <span class="podium-name">${escapeHtml(m.name)}</span>
      <span class="podium-xp">${m.xp} XP</span>
      <div class="podium-pedestal" aria-hidden="true">${m.rank}</div>
    </div>
  `;
}

function renderRow(m, currentUserId) {
  const isCurrent = m.uid === currentUserId;
  const medal = MEDALS[m.rank];
  return `
    <div class="leaderboard-row ${isCurrent ? 'leaderboard-row--current' : ''}" role="listitem">
      <span class="leaderboard-row__rank ${medal ? 'leaderboard-row__rank--medal' : ''}" aria-label="Rank ${m.rank}">${medal || m.rank}</span>
      <div class="leaderboard-row__avatar" aria-hidden="true">${escapeHtml(m.name.charAt(0).toUpperCase())}</div>
      <div class="leaderboard-row__info">
        <div class="leaderboard-row__name">
          <span>${escapeHtml(m.name)}</span>
          ${isCurrent ? '<span class="badge badge--glow badge--you">You</span>' : ''}
        </div>
        <div class="leaderboard-row__meta">${describeMember(m)}</div>
      </div>
      <div class="leaderboard-row__xp">${m.xp}<small>XP</small></div>
    </div>
  `;
}

export function renderLeaderboard(mountEl, { rankedMembers = [], currentUserId = null }) {
  if (rankedMembers.length === 0) {
    mountEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🏆</div>
        <h2>Leaderboard is Empty</h2>
        <p>Complete your first prompt lab to earn XP and take your place on the cohort leaderboard.</p>
        <a href="#roadmap" class="btn btn--primary">Start First Lab</a>
      </div>
    `;
    return;
  }

  const top3 = rankedMembers.slice(0, 3);
  // Source order 2nd, 1st, 3rd puts the winner in the middle column -- the
  // classic podium silhouette.
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  mountEl.innerHTML = `
    <div class="leaderboard-container">
      <div class="leaderboard-header">
        <div class="site-header__title-row">
          <h2>Cohort Leaderboard</h2>
          <span class="badge badge--cluster">Live XP Rankings</span>
        </div>
        <p class="leaderboard-sub">Earn XP by passing live-graded labs, maintaining daily streaks, and building your continuous assistant.</p>
      </div>

      ${top3.length >= 2 ? `
        <div class="podium">
          ${podiumOrder.map((m) => renderPodiumStep(m, currentUserId)).join('')}
        </div>
      ` : ''}

      <div class="leaderboard-list" role="list" aria-label="Full cohort ranking">
        <div class="leaderboard-list__head">
          <span>All members</span>
          <span>${rankedMembers.length} ranked</span>
        </div>
        ${rankedMembers.map((m) => renderRow(m, currentUserId)).join('')}
      </div>
    </div>
  `;
}
