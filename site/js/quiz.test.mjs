import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderQuiz, scoreQuiz } from './quiz.js';

test('scoreQuiz counts matching answers', () => {
  assert.equal(scoreQuiz([1, 0, 2], [1, 0, 2]), 3);
  assert.equal(scoreQuiz([1, 0, 2], [1, 1, 2]), 2);
});

test('scoreQuiz does not count an unanswered question as correct', () => {
  assert.equal(scoreQuiz([1, 0], [1, undefined]), 1);
});

test('renderQuiz returns an empty string for an empty or missing quiz', () => {
  assert.equal(renderQuiz(undefined), '');
  assert.equal(renderQuiz([]), '');
});

test('renderQuiz includes each question, its 4 options, and the correct-answer index', () => {
  const html = renderQuiz([{ q: 'Q1?', o: ['a', 'b', 'c', 'd'], a: 2, e: 'because' }]);
  assert.match(html, /data-quiz-question="0" data-answer="2"/);
  assert.match(html, /Q1\?/);
  for (const opt of ['a', 'b', 'c', 'd']) assert.match(html, new RegExp(`>${opt}<`));
  assert.match(html, /data-quiz-explain hidden>because/);
});

test('renderQuiz escapes HTML in question, option, and explanation text', () => {
  const html = renderQuiz([{ q: '<b>Q</b>', o: ['<i>x</i>', 'b', 'c', 'd'], a: 0, e: '<script>' }]);
  assert.doesNotMatch(html, /<b>Q<\/b>/);
  assert.doesNotMatch(html, /<i>x<\/i>/);
  assert.doesNotMatch(html, /<script>/);
});

