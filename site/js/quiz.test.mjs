import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderQuizQuestion } from './quiz.js';

const ITEM = { q: 'Q1?', o: ['a', 'b', 'c', 'd'], a: 2, e: 'because' };

test('renderQuizQuestion includes the question, its 4 options, and the correct-answer index', () => {
  const html = renderQuizQuestion(ITEM);
  assert.match(html, /data-quiz-step data-answer="2"/);
  assert.match(html, /Q1\?/);
  for (const opt of ['a', 'b', 'c', 'd']) assert.match(html, new RegExp(`>${opt}<`));
  assert.match(html, /data-quiz-explain hidden>because/);
});

test('renderQuizQuestion escapes HTML in question, option, and explanation text', () => {
  const html = renderQuizQuestion({ q: '<b>Q</b>', o: ['<i>x</i>', 'b', 'c', 'd'], a: 0, e: '<script>' });
  assert.doesNotMatch(html, /<b>Q<\/b>/);
  assert.doesNotMatch(html, /<i>x<\/i>/);
  assert.doesNotMatch(html, /<script>/);
});
