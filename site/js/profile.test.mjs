import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateProfile, renderRegistrationForm, renderProfileView } from './profile.js';

const VALID_PROFILE = {
  name: 'Ada Lovelace',
  faculty: 'Engineering',
  department: 'Computer Engineering',
  level: '300L',
  careerGoal: 'AI Engineer',
  aiExperience: 'Built apps with LLM APIs',
  weeklyHours: '5-10 hours',
  githubUrl: 'https://github.com/adalovelace',
  linkedinUrl: 'https://linkedin.com/in/adalovelace',
  consent: true,
};

test('validateProfile returns valid: true for complete valid data', () => {
  const result = validateProfile(VALID_PROFILE);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateProfile flags missing required fields', () => {
  const result = validateProfile({ name: '' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.name, 'name error');
  assert.ok(result.errors.faculty, 'faculty error');
  assert.ok(result.errors.department, 'department error');
  assert.ok(result.errors.level, 'level error');
  assert.ok(result.errors.careerGoal, 'careerGoal error');
  assert.ok(result.errors.aiExperience, 'aiExperience error');
  assert.ok(result.errors.weeklyHours, 'weeklyHours error');
  assert.ok(result.errors.consent, 'consent error');
});

test('validateProfile validates social URLs if provided', () => {
  const invalidUrls = validateProfile({
    ...VALID_PROFILE,
    githubUrl: 'not-a-url',
    linkedinUrl: 'also-not-a-url',
  });
  assert.equal(invalidUrls.valid, false);
  assert.ok(invalidUrls.errors.githubUrl);
  assert.ok(invalidUrls.errors.linkedinUrl);

  const emptyUrls = validateProfile({
    ...VALID_PROFILE,
    githubUrl: '',
    linkedinUrl: '',
  });
  assert.equal(emptyUrls.valid, true);
});

test('renderRegistrationForm renders registration form with inputs', () => {
  const el = { innerHTML: '' };
  renderRegistrationForm(el, { name: 'Ada', email: 'ada@example.com' });
  assert.match(el.innerHTML, /data-profile-form/);
  assert.match(el.innerHTML, /name="name"/);
  assert.match(el.innerHTML, /value="Ada"/);
  assert.match(el.innerHTML, /name="faculty"/);
  assert.match(el.innerHTML, /name="department"/);
  assert.match(el.innerHTML, /Complete Registration/i);
});

test('renderProfileView renders member profile details and escapes HTML', () => {
  const el = { innerHTML: '' };
  renderProfileView(el, {
    name: '<b>Ada</b>',
    email: 'ada@example.com',
    faculty: 'Engineering',
    department: 'Computer Engineering',
    level: '300L',
    careerGoal: 'AI Engineer',
    aiExperience: 'Built apps with LLM APIs',
    weeklyHours: '5-10 hours',
    githubUrl: 'https://github.com/ada',
    linkedinUrl: '',
    registeredAt: 1700000000000,
  });
  assert.doesNotMatch(el.innerHTML, /<b>Ada<\/b>/);
  assert.match(el.innerHTML, /Computer Engineering/);
  assert.match(el.innerHTML, /300L/);
  assert.match(el.innerHTML, /AI Engineer/);
});

test('renderProfileView never links a non-http(s) social URL, in case one reaches the client via a raw write', () => {
  const el = { innerHTML: '' };
  renderProfileView(el, {
    name: 'Eve', githubUrl: 'javascript:alert(1)', linkedinUrl: 'data:text/html,bad',
  });
  assert.doesNotMatch(el.innerHTML, /href="javascript:/);
  assert.doesNotMatch(el.innerHTML, /href="data:/);
  assert.match(el.innerHTML, /Not linked/);
});

