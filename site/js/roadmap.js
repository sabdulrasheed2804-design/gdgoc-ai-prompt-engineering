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

export async function runLabSubmission({ submitLab, recordLabRun, memberId, week, labId, promptText }) {
  let result;
  try {
    result = await submitLab({ week, labId, promptText });
  } catch (err) {
    return { text: err.message };
  }

  try {
    await recordLabRun(memberId, { week, labId, ...result });
  } catch (err) {
    // recordLabRun is a client-side history mirror, not the source of truth
    // (the server already wrote the authoritative labRuns record) -- a
    // failure here must never hide the grade that was just shown.
    console.warn('local history mirror write failed', err);
  }

  return {
    text: result.passed ? `Passed: ${result.feedback}` : `Not yet: ${result.feedback}`,
  };
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

      const outcome = await runLabSubmission({
        submitLab, recordLabRun, memberId, week, labId, promptText,
      });
      resultEl.textContent = outcome.text;
      button.disabled = false;
    });
  });
}
