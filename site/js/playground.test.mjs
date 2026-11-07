import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateTokens,
  formatTemperatureGuidance,
  simulatePromptExecution,
  PLAYGROUND_PRESETS,
  renderPlayground,
} from './playground.js';

// --- estimateTokens ---
test('estimateTokens returns 0 for empty or falsy input', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens(null), 0);
  assert.equal(estimateTokens(undefined), 0);
});

test('estimateTokens approximates ~4 chars per token', () => {
  const tokens = estimateTokens('Hello world test string'); // 22 chars => ceil(22/4) = 6
  assert.equal(tokens, 6);
});

test('estimateTokens trims whitespace before counting', () => {
  assert.equal(estimateTokens('   ab   '), 1); // "ab" = 2 chars => ceil(2/4) = 1
});

// --- formatTemperatureGuidance ---
test('temperature 0.0 returns deterministic guidance', () => {
  const guide = formatTemperatureGuidance(0.0);
  assert.match(guide.label, /Deterministic/);
  assert.match(guide.badgeClass, /deterministic/);
  assert.match(guide.desc, /JSON|code|classification/i);
});

test('temperature 0.2 is still deterministic range', () => {
  const guide = formatTemperatureGuidance(0.2);
  assert.match(guide.label, /Deterministic/);
});

test('temperature 0.4 returns balanced guidance', () => {
  const guide = formatTemperatureGuidance(0.4);
  assert.match(guide.label, /Balanced/);
  assert.match(guide.badgeClass, /balanced/);
});

test('temperature 0.8 returns creative guidance', () => {
  const guide = formatTemperatureGuidance(0.8);
  assert.match(guide.label, /Creative/);
  assert.match(guide.badgeClass, /creative/);
});

test('temperature 1.0 returns creative guidance', () => {
  const guide = formatTemperatureGuidance(1.0);
  assert.match(guide.label, /Creative/);
});

// --- simulatePromptExecution ---
test('simulatePromptExecution returns preset output when preset is provided', () => {
  const preset = PLAYGROUND_PRESETS[0];
  const result = simulatePromptExecution({
    systemPrompt: preset.systemPrompt,
    userInput: preset.userInput,
    temperature: preset.temperature,
    preset,
  });
  assert.equal(result.outputText, preset.engineeredOutput);
  assert.ok(result.latencyMs >= 100);
  assert.ok(result.inputTokens > 0);
  assert.ok(result.outputTokens > 0);
  assert.ok(result.timestamp > 0);
});

test('simulatePromptExecution returns JSON when system prompt mentions json', () => {
  const result = simulatePromptExecution({
    systemPrompt: 'Return JSON only.',
    userInput: 'Hello',
    temperature: 0.0,
    preset: null,
  });
  assert.ok(result.isValidJson);
  const parsed = JSON.parse(result.outputText);
  assert.ok(parsed.response);
  assert.equal(parsed.status, 'success');
});

test('simulatePromptExecution falls back to text response without json keyword', () => {
  const result = simulatePromptExecution({
    systemPrompt: 'You are a poet.',
    userInput: 'Write a haiku.',
    temperature: 0.7,
    preset: null,
  });
  assert.match(result.outputText, /temperature/);
  assert.equal(result.isValidJson, false);
});

// --- PLAYGROUND_PRESETS ---
test('PLAYGROUND_PRESETS has entries for weeks 1 through 7', () => {
  for (let w = 1; w <= 7; w++) {
    const preset = PLAYGROUND_PRESETS.find((p) => p.week === w);
    assert.ok(preset, `Missing preset for week ${w}`);
    assert.ok(preset.systemPrompt.length > 20, `Preset week ${w} systemPrompt too short`);
    assert.ok(preset.naivePrompt.length > 5, `Preset week ${w} naivePrompt too short`);
    assert.ok(preset.naiveOutput.length > 5, `Preset week ${w} naiveOutput too short`);
    assert.ok(preset.engineeredOutput.length > 5, `Preset week ${w} engineeredOutput too short`);
    assert.ok(preset.explanation.length > 10, `Preset week ${w} explanation too short`);
    assert.ok(typeof preset.temperature === 'number');
  }
});

// --- renderPlayground ---
test('renderPlayground renders the playground UI with preset selector', () => {
  const el = { innerHTML: '' };
  renderPlayground(el);
  assert.match(el.innerHTML, /Prompt Engineering Studio/);
  assert.match(el.innerHTML, /preset-select/);
  assert.match(el.innerHTML, /system-prompt-input/);
  assert.match(el.innerHTML, /user-prompt-input/);
  assert.match(el.innerHTML, /temp-slider/);
  assert.match(el.innerHTML, /Run .* Test Prompt/);
  assert.match(el.innerHTML, /Compare with Naive/);
});

test('renderPlayground loads the correct preset when initialWeek is provided', () => {
  const el = { innerHTML: '' };
  renderPlayground(el, { initialWeek: 3 });
  assert.match(el.innerHTML, /Chain-of-Thought/);
  assert.match(el.innerHTML, /selected/); // "Week 3" option is selected
});

test('renderPlayground escapes HTML in preset content', () => {
  const el = { innerHTML: '' };
  renderPlayground(el, { initialWeek: 1 });
  // System prompt contains angle brackets for JSON schema
  assert.doesNotMatch(el.innerHTML, /<thinking>/); // Should be escaped if present
});
