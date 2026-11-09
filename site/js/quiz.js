import { escapeHtml } from './util.js';

// One question per call -- lesson.js slots this in as a single step in the
// week's continuous sequence, instead of all 5 questions (and their own
// "Check answers" button) rendered open at once.
export function renderQuizQuestion(item) {
  const options = item.o
    .map((opt, i) => `<button type="button" class="quiz__option" data-quiz-option data-opt="${i}">${escapeHtml(opt)}</button>`)
    .join('');

  return `
    <div class="quiz-step" data-quiz-step data-answer="${item.a}">
      <p class="quiz-step__q">${escapeHtml(item.q)}</p>
      <div class="quiz-step__options">${options}</div>
      <button type="button" class="btn btn--primary btn--sm" data-quiz-check>Check answer</button>
      <p class="quiz-step__explain" data-quiz-explain hidden>${escapeHtml(item.e)}</p>
    </div>
  `;
}

function wireQuizStep(stepEl) {
  const correct = Number(stepEl.dataset.answer);
  let selected = null;

  stepEl.querySelectorAll('[data-quiz-option]').forEach((button) => {
    button.addEventListener('click', () => {
      selected = Number(button.dataset.opt);
      stepEl.querySelectorAll('[data-quiz-option]').forEach((b) => b.classList.toggle('is-selected', b === button));
    });
  });

  stepEl.querySelector('[data-quiz-check]')?.addEventListener('click', () => {
    // Clearing marks before reapplying makes a repeat click (after changing
    // the selection) idempotent instead of stacking stale correct/incorrect
    // classes from the previous check.
    stepEl.querySelectorAll('[data-quiz-option]').forEach((button) => {
      button.classList.remove('is-correct', 'is-incorrect');
      const opt = Number(button.dataset.opt);
      if (opt === correct) button.classList.add('is-correct');
      else if (opt === selected) button.classList.add('is-incorrect');
    });

    const explain = stepEl.querySelector('[data-quiz-explain]');
    if (explain) explain.hidden = false;
  });
}

export function wireQuizSteps(mountEl) {
  mountEl.querySelectorAll('[data-quiz-step]').forEach(wireQuizStep);
}
