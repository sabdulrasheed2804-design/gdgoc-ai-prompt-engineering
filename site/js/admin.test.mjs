import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCohortStats, exportMembersToCsv, renderAdminDashboard } from './admin.js';

const SAMPLE_MEMBERS = [
  {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    faculty: 'Engineering',
    department: 'Computer Science',
    level: '300L',
    careerGoal: 'AI Engineer',
    aiExperience: 'Built apps with LLM APIs',
    weeklyHours: '5-10 hours',
    githubUrl: 'https://github.com/ada',
    linkedinUrl: '',
    registeredAt: 1700000000000,
  },
  {
    name: 'Charles Babbage',
    email: 'charles@example.com',
    faculty: 'Science',
    department: 'Mathematics',
    level: '400L',
    careerGoal: 'AI / ML Researcher',
    aiExperience: 'Beginner',
    weeklyHours: '3-5 hours',
    githubUrl: '',
    linkedinUrl: '',
    registeredAt: 1700000100000,
  },
];

const SAMPLE_MILESTONES = [
  { id: 'u1-w1', memberId: 'u1', memberName: 'Ada Lovelace', week: 1, status: 'pending', repoUrl: 'https://github.com/ada/cli', notes: 'CLI assistant' },
  { id: 'u2-w1', memberId: 'u2', memberName: 'Charles Babbage', week: 1, status: 'approved', repoUrl: 'https://github.com/charles/cli', notes: 'Math bot' },
];

test('computeCohortStats calculates aggregate metrics correctly', () => {
  const stats = computeCohortStats(SAMPLE_MEMBERS, SAMPLE_MILESTONES);
  assert.equal(stats.totalMembers, 2);
  assert.equal(stats.levelBreakdown['300L'], 1);
  assert.equal(stats.levelBreakdown['400L'], 1);
  assert.equal(stats.trackBreakdown['AI Engineer'], 1);
  assert.equal(stats.milestones.pending, 1);
  assert.equal(stats.milestones.approved, 1);
  assert.equal(stats.milestones.total, 2);
});

test('exportMembersToCsv formats valid CSV with proper headers and escaping', () => {
  const csv = exportMembersToCsv(SAMPLE_MEMBERS);
  assert.match(csv, /^Name,Email,Faculty,Department,Level,CareerTrack,Experience,WeeklyHours,GitHub,LinkedIn/);
  assert.match(csv, /Ada Lovelace,ada@example\.com,Engineering,Computer Science,300L/);
  assert.match(csv, /Charles Babbage/);
});

test('renderAdminDashboard renders tabs, member tables, and milestone queue', () => {
  const el = { innerHTML: '' };
  const stats = computeCohortStats(SAMPLE_MEMBERS, SAMPLE_MILESTONES);
  renderAdminDashboard(el, { stats, members: SAMPLE_MEMBERS, milestones: SAMPLE_MILESTONES });
  assert.match(el.innerHTML, /Cohort Analytics/);
  assert.match(el.innerHTML, /Member Directory/);
  assert.match(el.innerHTML, /Milestone Reviews/);
  assert.match(el.innerHTML, /Ada Lovelace/);
  assert.match(el.innerHTML, /data-export-csv/);
  assert.match(el.innerHTML, /data-review-form/);
});

