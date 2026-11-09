import { submitLab } from './grading-client.js';
import { recordLabRun } from './store.js';
import { escapeHtml } from './util.js';
import { renderLessonStepper } from './lesson.js';
import { wireMilestoneForms } from './milestones.js';

function renderDateBadge(w) {
  if (w.status === 'current') return '<span class="badge badge--current-week">📍 This week</span>';
  if (w.status === 'upcoming') return `<span class="badge badge--upcoming">Opens ${escapeHtml(w.scheduledDate)}</span>`;
  return '';
}

function renderMenuTile(w) {
  const statusBadge = !w.unlocked
    ? '<span class="badge badge--locked">🔒 Locked</span>'
    : w.completed
      ? '<span class="badge badge--completed">✅ Completed</span>'
      : '<span class="badge badge--current-week">📍 Current</span>';

  const inner = `
    <div class="week-tile__head">
      <span class="week-tile__num">Week ${w.week}</span>
      ${statusBadge}
    </div>
    <h3 class="week-tile__title">${escapeHtml(w.title)}</h3>
    <p class="week-tile__objectives">${escapeHtml(w.objectives)}</p>
  `;

  return w.unlocked
    ? `<a class="week-tile" href="#roadmap/${w.week}" data-week="${w.week}">${inner}</a>`
    : `
      <div class="week-tile week-tile--locked" data-week="${w.week}">
        ${inner}
        <p class="week-tile__lock-note">Complete Week ${w.week - 1} to unlock</p>
      </div>
    `;
}

// The week menu -- a member clicks into one week at a time (its topics,
// pattern breakdown, quiz, lab and milestone) rather than a page listing
// all 8 weeks' content at once. A week stays locked until the previous
// one's lab is passed (see progress.js's computeWeekUnlocks), so there's
// no skipping ahead to week 5 without having done weeks 1-4.
export function renderWeekMenu(mountEl, weeks) {
  const tiles = weeks.map(renderMenuTile).join('');
  mountEl.innerHTML = `<div class="week-menu">${tiles}</div>`;
}

export function renderWeekDetail(mountEl, week, { milestonesByWeek = {} } = {}) {
  mountEl.innerHTML = `
    <a href="#roadmap" class="week-detail__back">← All weeks</a>
    <section class="week-card" data-week="${week.week}">
      <div class="week-card__head">
        <div class="week-card__badge-row">
          <span class="week-card__num">Week ${week.week}</span>
          ${week.lab ? '<span class="badge badge--lab">Lab Track</span>' : '<span class="badge badge--capstone">Capstone Sprint</span>'}
          ${renderDateBadge(week)}
        </div>
        <h2 class="week-card__title">${escapeHtml(week.title)}</h2>
      </div>

      <p class="week-card__objectives">${escapeHtml(week.objectives)}</p>

      ${renderLessonStepper(week, { submission: milestonesByWeek[week.week] })}
    </section>
  `;
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
