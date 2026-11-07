import { submitLab } from './grading-client.js';
import { recordLabRun } from './store.js';
import { escapeHtml } from './util.js';
import { renderQuiz } from './quiz.js';
import { renderMilestoneBox, wireMilestoneForms } from './milestones.js';

export function renderPromptComparison(comparison, weekNumber) {
  if (!comparison) return '';
  return `
    <div class="prompt-comparison">
      <div class="prompt-comparison__header">
        <div class="prompt-comparison__badge-row">
          <span class="prompt-comparison__tag">Pattern Breakdown</span>
          <span class="prompt-comparison__technique">${escapeHtml(comparison.technique)}</span>
        </div>
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

const RESOURCE_TYPE_LABELS = {
  guide: '📘 Guide',
  docs: '🛠️ Docs',
  video: '🎥 Video',
  paper: '📄 Paper',
  tool: '⚡ Tool',
};

export function renderResources(resources) {
  if (!resources || !resources.length) return '';
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

  return `
    <div class="week-card__resources">
      <h3 class="week-card__section-title">📚 Interactive Resources & Deep Dives</h3>
      <ul class="resource-card-list">${items}</ul>
    </div>
  `;
}

function renderStatusBadge(w) {
  if (w.status === 'current') return '<span class="badge badge--current-week">📍 This week</span>';
  if (w.status === 'upcoming') return `<span class="badge badge--upcoming">🔒 Opens ${escapeHtml(w.scheduledDate)}</span>`;
  return '';
}

// The lab challenge and quiz are the two heaviest, most attention-grabbing
// blocks on a card -- for an upcoming week they're wrapped in a closed
// <details> disclosure instead of rendered open, so the roadmap shows this
// week prominently rather than all 8 weeks fully expanded at once. A
// motivated member can still expand ahead; nothing is hard-blocked, same
// non-blocking pacing InfraTrack itself uses (it marks future modules
// "Upcoming" rather than hiding them).
function renderWeekBody(w, milestonesByWeek) {
  const labBox = w.lab ? `
    <div class="week-card__lab-box">
      <div class="lab-box__header">
        <span class="lab-box__title">🧪 Graded Prompt Challenge</span>
        <span class="badge badge--server">Gemini Evaluated</span>
      </div>
      <p class="week-card__lab"><strong>Lab:</strong> ${escapeHtml(w.lab.prompt)}</p>
      <form class="lab-form" data-lab-form data-lab-id="${w.lab.id}">
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
  ` : '';

  const body = `
    ${renderMilestoneBox({ week: w.week, milestoneDesc: w.milestone, submission: milestonesByWeek[w.week] })}
    ${labBox}
    ${w.quiz ? renderQuiz(w.quiz) : ''}
    ${renderResources(w.resources)}
  `;

  return w.status === 'upcoming'
    ? `<details class="week-card__preview"><summary>Preview this week's lab, quiz and resources</summary>${body}</details>`
    : body;
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

        ${w.topics ? `
          <div class="week-card__section">
            <h3 class="week-card__section-title">Core Concepts</h3>
            <ul class="week-card__topics">${w.topics.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
          </div>
        ` : ''}

        ${renderPromptComparison(w.promptComparison, w.week)}

        ${renderWeekBody(w, milestonesByWeek)}
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
