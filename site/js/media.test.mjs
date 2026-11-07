import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawCertificate, drawSpotlightFlyer, exportCanvasToPng } from './media.js';

function createMockCanvas() {
  const calls = [];
  const ctx = {
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    fillRect: (...args) => calls.push(['fillRect', args]),
    strokeRect: (...args) => calls.push(['strokeRect', args]),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...args) => calls.push(['moveTo', args]),
    lineTo: (...args) => calls.push(['lineTo', args]),
    arc: (...args) => calls.push(['arc', args]),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
    fillText: (text, ...args) => calls.push(['fillText', [text, ...args]]),
    roundRect: (...args) => calls.push(['roundRect', args]),
  };

  return {
    getContext: () => ctx,
    calls,
  };
}

test('drawCertificate safely handles null canvas or missing context', () => {
  assert.doesNotThrow(() => drawCertificate(null));
  assert.doesNotThrow(() => drawCertificate({}));
});

test('drawCertificate draws complete certificate with recipient details', () => {
  const canvas = createMockCanvas();
  drawCertificate(canvas, {
    recipientName: 'Grace Hopper',
    trackName: 'AI & Prompt Engineering Track',
    tier: 'Honors',
    certId: 'GDGOC-AI-TEST-99',
  });

  const texts = canvas.calls.filter((c) => c[0] === 'fillText').map((c) => c[1][0]);
  assert.ok(texts.includes('Grace Hopper'));
  assert.ok(texts.includes('CERTIFICATE OF HONORS'));
  assert.ok(texts.some((t) => t.includes('GDGOC-AI-TEST-99')));
  assert.ok(texts.includes('TIER: HONORS'));
});

test('drawSpotlightFlyer draws spotlight flyer with top learners', () => {
  const canvas = createMockCanvas();
  drawSpotlightFlyer(canvas, {
    weekNumber: 4,
    topicTitle: 'Reliability & Safety Guardrails',
    topLearners: [
      { name: 'Alice', xp: 120, labsPassed: 4, careerGoal: 'AI Engineer' },
      { name: 'Bob', xp: 110, labsPassed: 4, careerGoal: 'Prompt Engineer' },
    ],
  });

  const texts = canvas.calls.filter((c) => c[0] === 'fillText').map((c) => c[1][0]);
  assert.ok(texts.includes('LEARNERS OF THE WEEK'));
  assert.ok(texts.includes('Reliability & Safety Guardrails'));
  assert.ok(texts.includes('Alice'));
  assert.ok(texts.includes('Bob'));
});

