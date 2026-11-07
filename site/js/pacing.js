function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// One week per week number, same weekly cadence InfraTrack uses -- week 1
// opens on weekStart, week 2 seven days later, and so on.
export function scheduledDate(weekNumber, weekStart) {
  return addDays(weekStart, (weekNumber - 1) * 7);
}

// Mirrors InfraTrack's own currentModule(): the latest week whose scheduled
// date has arrived, defaulting to week 1 before the program has started (so
// there's always exactly one "current" week to foreground, never zero).
export function annotateWeekStatus(weeks, { weekStart, today }) {
  let currentWeek = weeks[0]?.week;
  for (const w of weeks) {
    if (scheduledDate(w.week, weekStart) <= today) currentWeek = w.week;
  }
  return weeks.map((w) => ({
    ...w,
    scheduledDate: scheduledDate(w.week, weekStart),
    status: w.week < currentWeek ? 'past' : w.week === currentWeek ? 'current' : 'upcoming',
  }));
}
