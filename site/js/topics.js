import { escapeHtml } from './util.js';

// Renders every topic's full content up front (one <div data-topic-panel>
// per topic, all but the first hidden) rather than one at a time in the
// DOM -- wireTopicStepper just toggles which panel is visible, matching
// this codebase's existing render-everything/wire-visibility pattern (see
// quiz.js). Shows exactly one topic at a time: "pouring every topic in
// their face" was the thing being fixed, so there is no all-topics-open
// fallback here.
export function renderTopicStepper(topics) {
  if (!topics || topics.length === 0) return '';

  const panels = topics
    .map((t, i) => `
      <div class="topic-stepper__panel" data-topic-panel data-index="${i}" ${i === 0 ? '' : 'hidden'}>
        <h4 class="topic-stepper__title">${escapeHtml(t.title)}</h4>
        <p class="topic-stepper__explanation">${escapeHtml(t.explanation)}</p>
      </div>
    `)
    .join('');

  const dots = topics
    .map((_, i) => `<button type="button" class="topic-stepper__dot ${i === 0 ? 'is-active' : ''}" data-topic-dot data-index="${i}" aria-label="Topic ${i + 1}"></button>`)
    .join('');

  return `
    <div class="topic-stepper" data-topic-stepper data-current="0">
      <div class="topic-stepper__head">
        <h3 class="week-card__section-title">Core Concepts</h3>
        <span class="topic-stepper__counter" data-topic-counter>Topic 1 of ${topics.length}</span>
      </div>
      ${panels}
      <div class="topic-stepper__nav">
        <button type="button" class="btn btn--secondary btn--sm" data-topic-prev disabled>← Previous</button>
        <div class="topic-stepper__dots">${dots}</div>
        <button type="button" class="btn btn--secondary btn--sm" data-topic-next ${topics.length <= 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </div>
  `;
}

function showTopic(stepperEl, index) {
  const panels = stepperEl.querySelectorAll('[data-topic-panel]');
  const total = panels.length;
  const clamped = Math.max(0, Math.min(index, total - 1));

  panels.forEach((panel) => {
    panel.hidden = Number(panel.dataset.index) !== clamped;
  });
  stepperEl.querySelectorAll('[data-topic-dot]').forEach((dot) => {
    dot.classList.toggle('is-active', Number(dot.dataset.index) === clamped);
  });

  const counter = stepperEl.querySelector('[data-topic-counter]');
  if (counter) counter.textContent = `Topic ${clamped + 1} of ${total}`;

  const prevBtn = stepperEl.querySelector('[data-topic-prev]');
  if (prevBtn) prevBtn.disabled = clamped === 0;
  const nextBtn = stepperEl.querySelector('[data-topic-next]');
  if (nextBtn) nextBtn.disabled = clamped === total - 1;

  stepperEl.dataset.current = String(clamped);
}

export function wireTopicStepper(mountEl) {
  mountEl.querySelectorAll('[data-topic-stepper]').forEach((stepperEl) => {
    const current = () => Number(stepperEl.dataset.current || 0);

    stepperEl.querySelector('[data-topic-prev]')?.addEventListener('click', () => {
      showTopic(stepperEl, current() - 1);
    });
    stepperEl.querySelector('[data-topic-next]')?.addEventListener('click', () => {
      showTopic(stepperEl, current() + 1);
    });
    stepperEl.querySelectorAll('[data-topic-dot]').forEach((dot) => {
      dot.addEventListener('click', () => showTopic(stepperEl, Number(dot.dataset.index)));
    });
  });
}
