import { escapeHtml } from './util.js';

export const BADGE_DEFINITIONS = [
  {
    id: 'first-prompt',
    name: 'Hello, Model!',
    icon: '🚀',
    description: 'Complete your first graded prompt lab.',
    check: ({ stats }) => (stats?.labsPassed || 0) >= 1,
  },
  {
    id: 'json-wizard',
    name: 'JSON Wizard',
    icon: '📋',
    description: 'Pass Week 1 Foundations or Week 2 Structured Output lab.',
    check: ({ passedWeeks }) => passedWeeks.has(1) || passedWeeks.has(2),
  },
  {
    id: 'reasoning-master',
    name: 'Chain-of-Thought Master',
    icon: '🧠',
    description: 'Pass Week 3 Reasoning Techniques lab.',
    check: ({ passedWeeks }) => passedWeeks.has(3),
  },
  {
    id: 'guardrail-guardian',
    name: 'Guardrail Guardian',
    icon: '🛡️',
    description: 'Pass Week 4 Reliability, Safety & Evaluation lab.',
    check: ({ passedWeeks }) => passedWeeks.has(4),
  },
  {
    id: 'rag-explorer',
    name: 'RAG Architect',
    icon: '📚',
    description: 'Pass Week 5 Retrieval-Augmented Generation lab.',
    check: ({ passedWeeks }) => passedWeeks.has(5),
  },
  {
    id: 'tool-craftsman',
    name: 'Tool Craftsman',
    icon: '⚙️',
    description: 'Pass Week 6 Tool Use & Function Calling lab.',
    check: ({ passedWeeks }) => passedWeeks.has(6),
  },
  {
    id: 'agent-pioneer',
    name: 'Agent Pioneer',
    icon: '🤖',
    description: 'Pass Week 7 Autonomous Agents lab.',
    check: ({ passedWeeks }) => passedWeeks.has(7),
  },
  {
    id: 'streak-3',
    name: 'Momentum Builder',
    icon: '🔥',
    description: 'Build a 3-day active practice streak.',
    check: ({ stats }) => (stats?.streak || 0) >= 3,
  },
  {
    id: 'streak-7',
    name: 'Relentless',
    icon: '⚡',
    description: 'Build a 7-day active practice streak.',
    check: ({ stats }) => (stats?.streak || 0) >= 7,
  },
  {
    id: 'portfolio-published',
    name: 'Prompt Perfectionist',
    icon: '🌟',
    description: 'Publish at least one verified prompt to your public portfolio.',
    check: ({ portfolioEntries }) => portfolioEntries.some((e) => e.published),
  },
  {
    id: 'milestone-achiever',
    name: 'Milestone Maker',
    icon: '🎯',
    description: 'Have at least one continuous assistant milestone approved by a lead.',
    check: ({ milestones }) => milestones.some((m) => m.status === 'approved' || m.status === 'excellent'),
  },
  {
    id: 'cohort-finisher',
    name: 'Track Champion',
    icon: '🏆',
    description: 'Pass all 7 graded prompt labs across the curriculum.',
    check: ({ stats }) => (stats?.labsPassed || 0) >= (stats?.totalLabs || 7),
  },
];

export function computeBadges({ labRuns = [], stats = {}, portfolioEntries = [], milestones = [] } = {}) {
  const passedWeeks = new Set(
    labRuns.filter((r) => r.passed).map((r) => Number(r.week))
  );

  const context = {
    labRuns,
    stats,
    portfolioEntries,
    milestones,
    passedWeeks,
  };

  return BADGE_DEFINITIONS.map((def) => ({
    id: def.id,
    name: def.name,
    icon: def.icon,
    description: def.description,
    unlocked: Boolean(def.check(context)),
  }));
}

export function renderBadgeGrid(badges = []) {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return `
    <div class="badges-shelf">
      <div class="badges-shelf__header">
        <div class="badges-shelf__title-row">
          <h3>Achievements & Badges</h3>
          <span class="badge badge--cluster">${unlockedCount}/${badges.length} Unlocked</span>
        </div>
        <p class="badges-shelf__sub">Earn badges as you pass labs, build streaks, publish prompts, and submit milestones.</p>
      </div>

      <div class="badges-grid">
        ${badges.map((b) => `
          <div class="badge-item ${b.unlocked ? 'badge-item--unlocked' : 'badge-item--locked'}" title="${escapeHtml(b.description)}">
            <div class="badge-item__icon">${b.icon}</div>
            <div class="badge-item__info">
              <span class="badge-item__name">${escapeHtml(b.name)}</span>
              <span class="badge-item__desc">${escapeHtml(b.description)}</span>
            </div>
            ${b.unlocked ? '<span class="badge-item__status">Unlocked</span>' : '<span class="badge-item__status badge-item__status--locked">Locked</span>'}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

