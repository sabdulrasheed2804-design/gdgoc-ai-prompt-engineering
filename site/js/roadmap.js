import { submitLab } from './grading-client.js';
import { recordLabRun } from './store.js';

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderRoadmap(mountEl, weeks) {
  const cards = weeks
    .map((w) => `
      <section class="week-card" data-week="${w.week}">
        <div class="week-card__head">
          <span class="week-card__num">Week ${w.week}</span>
          <h2 class="week-card__title">${escapeHtml(w.title)}</h2>
        </div>
        <p class="week-card__objectives">${escapeHtml(w.objectives)}</p>
        ${w.lab ? `<p class="week-card__lab"><strong>Lab:</strong> ${escapeHtml(w.lab.prompt)}</p>` : ''}
        <p class="week-card__milestone"><strong>Milestone:</strong> ${escapeHtml(w.milestone)}</p>
        ${w.lab ? `
          <form class="lab-form" data-lab-form data-lab-id="${w.lab.id}">
            <textarea class="lab-form__input" data-lab-input rows="4" placeholder="Write your system prompt here"></textarea>
            <button class="btn btn--primary" type="submit">Submit lab</button>
            <p class="lab-form__result" data-lab-result></p>
          </form>
        ` : ''}
      </section>
    `)
    .join('');
  mountEl.innerHTML = `<div class="week-grid">${cards}</div>`;
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
