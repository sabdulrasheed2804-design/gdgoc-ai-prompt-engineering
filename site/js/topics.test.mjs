import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTopicStepper } from './topics.js';

const TOPICS = [
  { title: 'Topic A', explanation: 'Explanation A' },
  { title: 'Topic B', explanation: 'Explanation B' },
  { title: 'Topic C', explanation: 'Explanation C' },
];

test('renderTopicStepper returns an empty string for an empty or missing topic list', () => {
  assert.equal(renderTopicStepper(undefined), '');
  assert.equal(renderTopicStepper([]), '');
});

test('renderTopicStepper shows only the first topic, counts, and renders one dot per topic', () => {
  const html = renderTopicStepper(TOPICS);
  assert.match(html, /Topic 1 of 3/);
  assert.match(html, /data-topic-panel data-index="0" >/);
  assert.match(html, /data-topic-panel data-index="1" hidden/);
  assert.match(html, /data-topic-panel data-index="2" hidden/);
  assert.equal((html.match(/data-topic-dot/g) || []).length, 3);
});

test('renderTopicStepper disables Previous on the first topic, and Next when there is only one topic', () => {
  const multi = renderTopicStepper(TOPICS);
  assert.match(multi, /data-topic-prev disabled/);
  assert.doesNotMatch(multi, /data-topic-next disabled/);

  const single = renderTopicStepper([TOPICS[0]]);
  assert.match(single, /data-topic-next disabled/);
});

test('renderTopicStepper escapes HTML in topic title and explanation', () => {
  const html = renderTopicStepper([{ title: '<script>', explanation: '<img onerror=x>' }]);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<img onerror/);
});
