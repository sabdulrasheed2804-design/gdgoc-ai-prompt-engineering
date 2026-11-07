import { escapeHtml } from './util.js';

export function scoreQuiz(correctAnswers = [], selectedAnswers = []) {
  return correctAnswers.reduce((count, correct, i) => {
    return (selectedAnswers[i] !== undefined && selectedAnswers[i] === correct) ? count + 1 : count;
  }, 0);
}

export function renderQuiz(quiz) {
  if (!quiz || quiz.length === 0) return '';

  const questionsHtml = quiz.map((item, qi) => {
    const optionsHtml = item.o.map((opt, optIndex) => (
      `<button type="button" class="quiz__option" data-quiz-option data-q="${qi}" data-opt="${optIndex}">${escapeHtml(opt)}</button>`
    )).join('');

    return `
  <div class="quiz__question" data-quiz-question="${qi}" data-answer="${item.a}">
    <p class="quiz__q">${qi + 1}. ${escapeHtml(item.q)}</p>
    <div class="quiz__options">
      ${optionsHtml}
    </div>
    <p class="quiz__explain" data-quiz-explain hidden>${escapeHtml(item.e)}</p>
  </div>`;
  }).join('');

  return `<div class="quiz" data-quiz>
  <h3 class="quiz__heading">Quick check</h3>${questionsHtml}
  <button type="button" class="btn btn--primary" data-quiz-check>Check answers</button>
  <p class="quiz__score" data-quiz-score hidden></p>
</div>`;
}

export function wireQuiz(mountEl) {
  const quizBlocks = mountEl.querySelectorAll('[data-quiz]');
  for (const block of quizBlocks) {
    const selected = [];
    const questionEls = block.querySelectorAll('[data-quiz-question]');
    const checkBtn = block.querySelector('[data-quiz-check]');
    const scoreEl = block.querySelector('[data-quiz-score]');

    const optionButtons = block.querySelectorAll('[data-quiz-option]');
    for (const optBtn of optionButtons) {
      optBtn.addEventListener('click', () => {
        const qIndex = Number(optBtn.dataset.q);
        const optIndex = Number(optBtn.dataset.opt);
        selected[qIndex] = optIndex;

        const qOptions = block.querySelectorAll(`[data-quiz-option][data-q="${qIndex}"]`);
        for (const btn of qOptions) {
          btn.classList.remove('is-selected');
        }
        optBtn.classList.add('is-selected');
      });
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        const correctAnswers = [];
        const selectedAnswers = [];

        questionEls.forEach((qEl) => {
          const qi = Number(qEl.dataset.quizQuestion);
          const correct = Number(qEl.dataset.answer);
          correctAnswers[qi] = correct;
          selectedAnswers[qi] = selected[qi];

          const options = qEl.querySelectorAll('[data-quiz-option]');
          options.forEach((opt) => {
            opt.classList.remove('is-correct', 'is-incorrect');
            const optVal = Number(opt.dataset.opt);
            if (optVal === correct) {
              opt.classList.add('is-correct');
            }
            if (selected[qi] !== undefined && selected[qi] !== correct && optVal === selected[qi]) {
              opt.classList.add('is-incorrect');
            }
          });

          const explainEl = qEl.querySelector('[data-quiz-explain]');
          if (explainEl) {
            explainEl.hidden = false;
          }
        });

        const score = scoreQuiz(correctAnswers, selectedAnswers);
        if (scoreEl) {
          scoreEl.textContent = `Score: ${score}/${questionEls.length}`;
          scoreEl.hidden = false;
        }
      });
    }
  }
}

