// Week N is reachable only once week N-1 is complete; week 1 is always
// reachable. "Complete" means a passing labRun for that week's lab -- the
// one thing this platform actually verifies server-side, rather than the
// milestone (lead-reviewed, can take days, and would otherwise strand a
// member who's already done the work waiting on a review). A week with no
// lab (the week 8 capstone) counts as complete as soon as it's reached,
// since there's nothing after it to gate.
export function computeWeekUnlocks(weeks, labRuns) {
  const passedLabIds = new Set(labRuns.filter((r) => r.passed).map((r) => r.labId));
  let previousComplete = true;

  return weeks.map((w) => {
    const unlocked = previousComplete;
    const completed = w.lab ? passedLabIds.has(w.lab.id) : previousComplete;
    previousComplete = completed;
    return { ...w, unlocked, completed };
  });
}
