import { escapeHtml } from './util.js';
import { renderQuizQuestion, wireQuizSteps } from './quiz.js';
import { renderMilestoneBox } from './milestones.js';

// A week is one continuous sequence a member steps through -- topics, then
// the pattern breakdown, then the quiz one question at a time, then the
// graded lab, the capstone milestone, and resources -- instead of each
// section rendered fully open at once. Order matches how a course usually
// teaches: learn the concepts, see a worked example, check understanding,
// do the real task, then go deeper.
export function buildWeekSteps(week, { submission } = {}) {
  const steps = [];
  for (const topic of week.topics || []) steps.push({ kind: 'topic', topic });
  if (week.promptComparison) steps.push({ kind: 'comparison', comparison: week.promptComparison });
  for (const item of week.quiz || []) steps.push({ kind: 'quiz', item });
  if (week.lab) steps.push({ kind: 'lab', lab: week.lab });
  steps.push({ kind: 'milestone', milestoneDesc: week.milestone, submission });
  if (week.resources?.length) steps.push({ kind: 'resources', resources: week.resources });
  return steps;
}

const KIND_LABEL = {
  topic: 'Core Concept',
  comparison: 'Pattern Breakdown',
  quiz: 'Quick Check',
  lab: 'Graded Challenge',
  milestone: 'Capstone Milestone',
  resources: 'Go Further',
};

const RESOURCE_TYPE_LABELS = {
  guide: '📘 Guide',
  docs: '🛠️ Docs',
  video: '🎥 Video',
  paper: '📄 Paper',
  tool: '⚡ Tool',
};

function renderComparison(comparison, weekNumber) {
  return `
    <div class="prompt-comparison">
      <div class="prompt-comparison__header">
        <span class="prompt-comparison__technique">${escapeHtml(comparison.technique)}</span>
        <a href="#playground?week=${weekNumber}" class="btn btn--secondary btn--sm prompt-comparison__try-btn" title="Open this technique in Prompt Playground">
          <span>⚡ Try in Playground</span>
        </a>
      </div>

      <div class="prompt-comparison__grid">
        <div class="comparison-column comparison-column--bad">
          <div class="comparison-column__header">
            <span class="comparison-column__icon">❌</span>
            <span class="comparison-column__label">Naive / Ambiguous Prompt</span>
          </div>
          <div class="comparison-column__prompt">
            <pre><code>${escapeHtml(comparison.badPrompt)}</code></pre>
          </div>
          <div class="comparison-column__output-label">Unreliable / Verbose Output:</div>
          <div class="comparison-column__output">
            <pre><code>${escapeHtml(comparison.badOutput)}</code></pre>
          </div>
        </div>

        <div class="comparison-column comparison-column--good">
          <div class="comparison-column__header">
            <span class="comparison-column__icon">✅</span>
            <span class="comparison-column__label">Engineered System Prompt</span>
          </div>
          <div class="comparison-column__prompt">
            <pre><code>${escapeHtml(comparison.goodPrompt)}</code></pre>
          </div>
          <div class="comparison-column__output-label">Deterministic & Structured Output:</div>
          <div class="comparison-column__output">
            <pre><code>${escapeHtml(comparison.goodOutput)}</code></pre>
          </div>
        </div>
      </div>

      <div class="prompt-comparison__footer">
        <div class="comparison-rule">
          <span class="comparison-rule__badge">💡 Why it works</span>
          <p class="comparison-rule__text">${escapeHtml(comparison.whyItWorks)}</p>
        </div>
      </div>
    </div>
  `;
}

function renderLabChallenge(lab) {
  return `
    <div class="week-card__lab-box">
      <div class="lab-box__header">
        <span class="lab-box__title">🧪 Graded Prompt Challenge</span>
        <span class="badge badge--server">Gemini Evaluated</span>
      </div>
      <p class="week-card__lab"><strong>Lab:</strong> ${escapeHtml(lab.prompt)}</p>
      <form class="lab-form" data-lab-form data-lab-id="${lab.id}">
        <div class="lab-editor">
          <div class="lab-editor__bar">
            <div class="lab-editor__dots">
              <span class="editor-dot"></span>
              <span class="editor-dot"></span>
              <span class="editor-dot"></span>
            </div>
            <span class="lab-editor__filename">system_prompt.txt</span>
          </div>
          <textarea class="lab-form__input" data-lab-input rows="5" placeholder="Write your system prompt here..."></textarea>
        </div>
        <div class="lab-form__actions">
          <button class="btn btn--primary" type="submit">Submit lab</button>
          <span class="lab-form__note">Server validates output against schema</span>
        </div>
        <p class="lab-form__result" data-lab-result></p>
      </form>
    </div>
  `;
}

function renderResourcesList(resources) {
  const items = resources
    .map((r) => {
      const typeLabel = RESOURCE_TYPE_LABELS[r.type] || '🔗 Resource';
      const timeBadge = r.time ? `<span class="resource-badge resource-badge--time">⏱️ ${escapeHtml(r.time)}</span>` : '';
      const essentialBadge = r.essential !== undefined
        ? (r.essential
          ? '<span class="resource-badge resource-badge--essential">⭐ Core Concept</span>'
          : '<span class="resource-badge resource-badge--optional">Deep Dive</span>')
        : '';
      const takeaway = r.takeaway
        ? `<p class="resource-card__takeaway">${escapeHtml(r.takeaway)}</p>`
        : '';

      return `
        <li class="resource-card">
          <div class="resource-card__header">
            <div class="resource-card__badges">
              <span class="resource-badge resource-badge--type">${escapeHtml(typeLabel)}</span>
              ${timeBadge}
              ${essentialBadge}
            </div>
            <a class="resource-card__link" href="${escapeHtml(r.url)}" target="_blank" rel="noopener">
              <span class="resource-card__title">${escapeHtml(r.title)}</span>
              <span class="resource-card__arrow">↗</span>
            </a>
          </div>
          ${takeaway}
        </li>
      `;
    })
    .join('');

  return `<ul class="resource-card-list">${items}</ul>`;
}

function renderStepContent(step, week) {
  switch (step.kind) {
    case 'topic':
      return `
        <h4 class="lesson-step__title">${escapeHtml(step.topic.title)}</h4>
        <p class="lesson-step__body">${escapeHtml(step.topic.explanation)}</p>
      `;
    case 'comparison':
      return renderComparison(step.comparison, week.week);
    case 'quiz':
      return renderQuizQuestion(step.item);
    case 'lab':
      return renderLabChallenge(step.lab);
    case 'milestone':
      return renderMilestoneBox({ week: week.week, milestoneDesc: step.milestoneDesc, submission: step.submission });
    case 'resources':
      return renderResourcesList(step.resources);
    default:
      return '';
  }
}

export function renderLessonStepper(week, { submission } = {}) {
  const steps = buildWeekSteps(week, { submission });
  if (steps.length === 0) return '';

  const panels = steps
    .map((step, i) => `
      <div class="lesson-stepper__panel" data-lesson-panel data-index="${i}" data-kind="${escapeHtml(KIND_LABEL[step.kind] || '')}" ${i === 0 ? '' : 'hidden'}>
        ${renderStepContent(step, week)}
      </div>
    `)
    .join('');

  const dots = steps
    .map((_, i) => `<button type="button" class="lesson-stepper__dot ${i === 0 ? 'is-active' : ''}" data-lesson-dot data-index="${i}" aria-label="Step ${i + 1}"></button>`)
    .join('');

  return `
    <div class="lesson-stepper" data-lesson-stepper data-current="0">
      <div class="lesson-stepper__head">
        <span class="lesson-stepper__kind" data-lesson-kind>${escapeHtml(KIND_LABEL[steps[0].kind] || '')}</span>
        <span class="lesson-stepper__counter" data-lesson-counter>Step 1 of ${steps.length}</span>
      </div>
      ${panels}
      <div class="lesson-stepper__nav">
        <button type="button" class="btn btn--secondary btn--sm" data-lesson-prev disabled>← Previous</button>
        <div class="lesson-stepper__dots">${dots}</div>
        <button type="button" class="btn btn--secondary btn--sm" data-lesson-next ${steps.length <= 1 ? 'disabled' : ''}>Next →</button>
      </div>
    </div>
  `;
}

function showStep(stepperEl, index) {
  const panels = stepperEl.querySelectorAll('[data-lesson-panel]');
  const total = panels.length;
  const clamped = Math.max(0, Math.min(index, total - 1));

  let activePanel = null;
  panels.forEach((panel) => {
    const isActive = Number(panel.dataset.index) === clamped;
    panel.hidden = !isActive;
    if (isActive) activePanel = panel;
  });
  stepperEl.querySelectorAll('[data-lesson-dot]').forEach((dot) => {
    dot.classList.toggle('is-active', Number(dot.dataset.index) === clamped);
  });

  const counter = stepperEl.querySelector('[data-lesson-counter]');
  if (counter) counter.textContent = `Step ${clamped + 1} of ${total}`;
  const kindEl = stepperEl.querySelector('[data-lesson-kind]');
  if (kindEl && activePanel) kindEl.textContent = activePanel.dataset.kind;

  const prevBtn = stepperEl.querySelector('[data-lesson-prev]');
  if (prevBtn) prevBtn.disabled = clamped === 0;
  const nextBtn = stepperEl.querySelector('[data-lesson-next]');
  if (nextBtn) nextBtn.disabled = clamped === total - 1;

  stepperEl.dataset.current = String(clamped);
}

export function wireLessonStepper(mountEl) {
  wireQuizSteps(mountEl);

  mountEl.querySelectorAll('[data-lesson-stepper]').forEach((stepperEl) => {
    const current = () => Number(stepperEl.dataset.current || 0);

    stepperEl.querySelector('[data-lesson-prev]')?.addEventListener('click', () => {
      showStep(stepperEl, current() - 1);
    });
    stepperEl.querySelector('[data-lesson-next]')?.addEventListener('click', () => {
      showStep(stepperEl, current() + 1);
    });
    stepperEl.querySelectorAll('[data-lesson-dot]').forEach((dot) => {
      dot.addEventListener('click', () => showStep(stepperEl, Number(dot.dataset.index)));
    });
  });
}
