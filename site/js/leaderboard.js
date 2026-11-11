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
  const rest = rankedMembers;

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
          ${top3[1] ? `
            <div class="podium-step podium-step--2 ${top3[1].uid === currentUserId ? 'podium-step--current' : ''}">
              <div class="podium-medal">🥈 2nd</div>
              <div class="podium-avatar">${escapeHtml(top3[1].name.charAt(0).toUpperCase())}</div>
              <span class="podium-name">${escapeHtml(top3[1].name)}</span>
              <span class="podium-track">${escapeHtml(top3[1].careerGoal)}</span>
              <div class="podium-stats">
                <span class="stat-chip stat-chip--xp">${top3[1].xp} XP</span>
                <span class="stat-chip stat-chip--labs">🧪 ${top3[1].labsPassed}</span>
              </div>
            </div>
          ` : ''}

          ${top3[0] ? `
            <div class="podium-step podium-step--1 ${top3[0].uid === currentUserId ? 'podium-step--current' : ''}">
              <div class="podium-crown">👑</div>
              <div class="podium-medal">🥇 1st</div>
              <div class="podium-avatar podium-avatar--gold">${escapeHtml(top3[0].name.charAt(0).toUpperCase())}</div>
              <span class="podium-name">${escapeHtml(top3[0].name)}</span>
              <span class="podium-track">${escapeHtml(top3[0].careerGoal)}</span>
              <div class="podium-stats">
                <span class="stat-chip stat-chip--xp">${top3[0].xp} XP</span>
                <span class="stat-chip stat-chip--labs">🧪 ${top3[0].labsPassed}</span>
              </div>
            </div>
          ` : ''}

          ${top3[2] ? `
            <div class="podium-step podium-step--3 ${top3[2].uid === currentUserId ? 'podium-step--current' : ''}">
              <div class="podium-medal">🥉 3rd</div>
              <div class="podium-avatar">${escapeHtml(top3[2].name.charAt(0).toUpperCase())}</div>
              <span class="podium-name">${escapeHtml(top3[2].name)}</span>
              <span class="podium-track">${escapeHtml(top3[2].careerGoal)}</span>
              <div class="podium-stats">
                <span class="stat-chip stat-chip--xp">${top3[2].xp} XP</span>
                <span class="stat-chip stat-chip--labs">🧪 ${top3[2].labsPassed}</span>
              </div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="leaderboard-list" role="table" aria-label="Full cohort ranking">
        <div class="leaderboard-list__header" role="row">
          <span role="columnheader">Rank</span>
          <span role="columnheader">Member</span>
          <span role="columnheader">Track</span>
          <span role="columnheader">Labs</span>
          <span role="columnheader">Streak</span>
          <span role="columnheader">Total XP</span>
        </div>
        ${rest.map((m) => {
          const isCurrent = m.uid === currentUserId;
          // Medal + ordinal ("🥇 1") doesn't fit on one line inside the
          // small round rank-pill below, so it wraps and the pill ends up
          // looking top-aligned instead of centered. The medal alone
          // already identifies the rank without the redundant number.
          let rankDisplay = `#${m.rank}`;
          if (m.rank === 1) rankDisplay = '🥇';
          else if (m.rank === 2) rankDisplay = '🥈';
          else if (m.rank === 3) rankDisplay = '🥉';

          return `
            <div class="leaderboard-row ${isCurrent ? 'leaderboard-row--current' : ''}" role="row">
              <div class="leaderboard-row__rank" role="cell">
                <span class="rank-pill rank-pill--${m.rank <= 3 ? m.rank : 'default'}">${rankDisplay}</span>
              </div>
              <div class="leaderboard-row__member" role="cell">
                <div class="member-cell">
                  <div class="mini-avatar">${escapeHtml(m.name.charAt(0).toUpperCase())}</div>
                  <div>
                    <strong>${escapeHtml(m.name)}</strong>
                    ${isCurrent ? '<span class="badge badge--glow badge--you">YOU</span>' : ''}
                    <div class="table-sub">${escapeHtml(m.department || '')} ${m.level ? '· ' + escapeHtml(m.level) : ''}</div>
                  </div>
                </div>
              </div>
              <div class="leaderboard-row__meta">
                <span class="leaderboard-row__track" role="cell">${escapeHtml(m.careerGoal)}</span>
                <span class="stat-chip stat-chip--labs" role="cell">🧪 ${m.labsPassed}</span>
                <span class="stat-chip stat-chip--streak" role="cell">🔥 ${m.streak}d</span>
                <span class="stat-chip stat-chip--xp" role="cell">${m.xp} XP</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

