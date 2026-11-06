const XP_PER_LAB = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function computeStats(labRuns, { totalLabs, now = new Date() }) {
  const passedLabIds = new Set(labRuns.filter((r) => r.passed).map((r) => r.labId));
  const activeDays = new Set(labRuns.map((r) => r.timestamp.slice(0, 10)));

  let streak = 0;
  let cursor = now.getTime();
  while (activeDays.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= ONE_DAY_MS;
  }

  return {
    labsPassed: passedLabIds.size,
    totalLabs,
    progressPct: Math.round((passedLabIds.size / totalLabs) * 100),
    xp: passedLabIds.size * XP_PER_LAB,
    streak,
  };
}
