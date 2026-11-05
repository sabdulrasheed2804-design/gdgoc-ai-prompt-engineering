function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderRoadmap(mountEl, weeks) {
  mountEl.innerHTML = weeks
    .map((w) => `
      <section>
        <h2>Week ${w.week} — ${escapeHtml(w.title)}</h2>
        <p>${escapeHtml(w.objectives)}</p>
        <p><strong>Lab:</strong> ${escapeHtml(w.lab.prompt)}</p>
        <p><strong>Milestone:</strong> ${escapeHtml(w.milestone)}</p>
      </section>
    `)
    .join('');
}
