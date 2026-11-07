import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankMembers, renderLeaderboard } from './leaderboard.js';

const MEMBERS = [
  { uid: 'u1', name: 'Ada Lovelace', careerGoal: 'AI Engineer' },
  { uid: 'u2', name: 'Charles Babbage', careerGoal: 'Researcher' },
  { uid: 'u3', name: 'Alan Turing', careerGoal: 'AI Engineer' },
];

const STATS_MAP = {
  u1: { xp: 120, labsPassed: 6, streak: 5 },
  u2: { xp: 80, labsPassed: 4, streak: 2 },
  u3: { xp: 140, labsPassed: 7, streak: 7 },
};

test('rankMembers sorts by XP descending and assigns accurate ranks', () => {
  const ranked = rankMembers(MEMBERS, STATS_MAP);
  assert.equal(ranked[0].uid, 'u3'); // Alan: 140 XP -> Rank 1
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].uid, 'u1'); // Ada: 120 XP -> Rank 2
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[2].uid, 'u2'); // Charles: 80 XP -> Rank 3
  assert.equal(ranked[2].rank, 3);
});

test('renderLeaderboard renders podium and highlights current user', () => {
  const el = { innerHTML: '' };
  const ranked = rankMembers(MEMBERS, STATS_MAP);
  renderLeaderboard(el, { rankedMembers: ranked, currentUserId: 'u1' });

  assert.match(el.innerHTML, /Alan Turing/);
  assert.match(el.innerHTML, /Ada Lovelace/);
  assert.match(el.innerHTML, /leaderboard-row--current/);
  assert.match(el.innerHTML, /podium/);
});

