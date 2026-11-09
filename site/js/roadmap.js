import { submitLab } from './grading-client.js';
import { recordLabRun } from './store.js';
import { escapeHtml } from './util.js';
import { renderLessonStepper } from './lesson.js';
import { wireMilestoneForms } from './milestones.js';

function renderStatusBadge(w) {
  if (w.status === 'current') return '<span class="badge badge--current-week">📍 This week</span>';
  if (w.status === 'upcoming') return `<span class="badge badge--upcoming">🔒 Opens ${escapeHtml(w.scheduledDate)}</span>`;
  return '';
}

export function renderRoadmap(mountEl, weeks, { milestonesByWeek = {} } = {}) {
  const cards = weeks
    .map((w) => `
      <section class="week-card week-card--${w.status || 'current'}" data-week="${w.week}">
        <div class="week-card__head">
          <div class="week-card__badge-row">
            <span class="week-card__num">Week ${w.week}</span>
            ${w.lab ? '<span class="badge badge--lab">Lab Track</span>' : '<span class="badge badge--capstone">Capstone Sprint</span>'}
            ${renderStatusBadge(w)}
          </div>
          <h2 class="week-card__title">${escapeHtml(w.title)}</h2>
        </div>

        <p class="week-card__objectives">${escapeHtml(w.objectives)}</p>

        ${renderLessonStepper(w, { submission: milestonesByWeek[w.week] })}
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
      resultEl.className = 'lab-form__result lab-form__result--grading';
      resultEl.textContent = 'Grading against test rubric…';

      const outcome = await runLabSubmission({
        submitLab, recordLabRun, memberId, week, labId, promptText,
      });
      const isPass = outcome.text.startsWith('Passed');
      resultEl.className = `lab-form__result ${isPass ? 'lab-form__result--pass' : 'lab-form__result--fail'}`;
      resultEl.textContent = outcome.text;
      button.disabled = false;
    });
  });
}

export { wireMilestoneForms };
