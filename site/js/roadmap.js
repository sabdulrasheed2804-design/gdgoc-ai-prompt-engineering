import { submitLab } from './grading-client.js';
import { recordLabRun } from './store.js';

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderRoadmap(mountEl, weeks) {
  mountEl.innerHTML = weeks
    .map((w) => `
      <section data-week="${w.week}">
        <h2>Week ${w.week} — ${escapeHtml(w.title)}</h2>
        <p>${escapeHtml(w.objectives)}</p>
        <p><strong>Lab:</strong> ${escapeHtml(w.lab.prompt)}</p>
        <p><strong>Milestone:</strong> ${escapeHtml(w.milestone)}</p>
        <form data-lab-form data-lab-id="${w.lab.id}">
          <textarea data-lab-input rows="4" placeholder="Write your system prompt here"></textarea>
          <button type="submit">Submit lab</button>
          <p data-lab-result></p>
        </form>
      </section>
    `)
    .join('');
}

export function wireLabForms(mountEl, memberId) {
  mountEl.querySelectorAll('[data-lab-form]').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const week = Number(form.closest('[data-week]').dataset.week);
      const labId = form.dataset.labId;
      const promptText = form.querySelector('[data-lab-input]').value;
      const resultEl = form.querySelector('[data-lab-result]');
      const button = form.querySelector('button');

      button.disabled = true;
      resultEl.textContent = 'Grading…';

      try {
        const result = await submitLab({ week, labId, promptText });
        resultEl.textContent = result.passed
          ? `Passed: ${result.feedback}`
          : `Not yet: ${result.feedback}`;
        await recordLabRun(memberId, { week, labId, ...result });
      } catch (err) {
        resultEl.textContent = err.message;
      } finally {
        button.disabled = false;
      }
    });
  });
}
