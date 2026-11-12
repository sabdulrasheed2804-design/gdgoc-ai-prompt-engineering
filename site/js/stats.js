// Single source of truth for XP amounts -- the grading Worker imports these
// too, so the dashboard's total and the server-written leaderboard total
// can never drift apart.
export const XP_PER_LAB = 10;
export const MILESTONE_XP = { approved: 15, excellent: 25 };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// XP a reviewed milestone is worth. Only the Worker sets xpAwarded (when a
// lead reviews), so a milestone a member merely submitted -- or one approved
// before XP existed -- counts for nothing until a lead's review goes through
// the Worker, keeping this in step with the leaderboard rather than ahead
// of it.
export function milestoneXp(milestone) {
  return Number(milestone?.xpAwarded) || 0;
}

export function computeStats(labRuns, { totalLabs, milestones = [], now = new Date() }) {
  const passedLabIds = new Set(labRuns.filter((r) => r.passed).map((r) => r.labId));
  const activeDays = new Set(labRuns.map((r) => r.timestamp.slice(0, 10)));

  let streak = 0;
  let cursor = now.getTime();
  while (activeDays.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= ONE_DAY_MS;
  }

  const milestoneXpTotal = milestones.reduce((sum, m) => sum + milestoneXp(m), 0);

  return {
    labsPassed: passedLabIds.size,
    totalLabs,
    progressPct: Math.round((passedLabIds.size / totalLabs) * 100),
    xp: passedLabIds.size * XP_PER_LAB + milestoneXpTotal,
    milestoneXp: milestoneXpTotal,
    streak,
  };
}
