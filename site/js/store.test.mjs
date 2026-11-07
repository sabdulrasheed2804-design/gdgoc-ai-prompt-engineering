import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocalMode, setMember, getMember, getAllMembers, checkIsAdmin, submitMilestone, getMilestones, getAllMilestones, reviewMilestone, addJournalEntry, getJournalEntries, recordLabRun, getLabRuns, getAllLabRuns, getPortfolioEntries, setPortfolioPublished, getPublicPortfolio, issueCertificate, getCertificate, getMemberCertificates, getAllCertificates } from './store.js';

test('local mode round-trips a member record', async () => {
  const firebaseConfig = null;
  assert.equal(isLocalMode(firebaseConfig), true);
  await setMember('uid1', { name: 'Ada' }, { firebaseConfig });
  const m = await getMember('uid1', { firebaseConfig });
  assert.equal(m.name, 'Ada');
});

test("getLabRuns returns only the given member's runs, in local mode", async () => {
  await recordLabRun('member-a', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  await recordLabRun('member-b', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  const runs = await getLabRuns('member-a', { firebaseConfig: null });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].memberId, 'member-a');
});

test("getPortfolioEntries returns only the given member's entries, in local mode", async () => {
  await setPortfolioPublished('member-x', 1, false, { firebaseConfig: null });
  const entries = await getPortfolioEntries('member-x', { firebaseConfig: null });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].week, 1);
});

test('getPublicPortfolio only returns published entries', async () => {
  await setPortfolioPublished('member-y', 1, true, { firebaseConfig: null });
  await setPortfolioPublished('member-y', 2, false, { firebaseConfig: null });
  const publicEntries = await getPublicPortfolio('member-y', { firebaseConfig: null });
  assert.equal(publicEntries.length, 1);
  assert.equal(publicEntries[0].week, 1);
});

test('checkIsAdmin recognizes local admin', async () => {
  const isAdmin = await checkIsAdmin('local-member', { firebaseConfig: null });
  assert.equal(isAdmin, true);
  const isNotAdmin = await checkIsAdmin('random-user', { firebaseConfig: null });
  assert.equal(isNotAdmin, false);
});

test('getAllMembers returns all registered members', async () => {
  await setMember('u-all-1', { name: 'User 1' }, { firebaseConfig: null });
  await setMember('u-all-2', { name: 'User 2' }, { firebaseConfig: null });
  const all = await getAllMembers({ firebaseConfig: null });
  assert.ok(all.length >= 2);
  assert.ok(all.some((m) => m.name === 'User 1'));
});

test('submitMilestone and reviewMilestone workflow', async () => {
  const record = await submitMilestone('u-mile', {
    week: 1,
    repoUrl: 'https://github.com/u/repo',
    notes: 'Built CLI',
  }, { firebaseConfig: null });

  assert.equal(record.status, 'pending');
  assert.equal(record.week, 1);

  const memberMilestones = await getMilestones('u-mile', { firebaseConfig: null });
  assert.equal(memberMilestones.length, 1);

  const reviewed = await reviewMilestone(record.id, {
    status: 'approved',
    feedback: 'Great start!',
    reviewerName: 'Lead Ada',
  }, { firebaseConfig: null });

  assert.equal(reviewed.status, 'approved');
  assert.equal(reviewed.feedback, 'Great start!');

  const allMilestones = await getAllMilestones({ firebaseConfig: null });
  assert.ok(allMilestones.some((m) => m.id === record.id && m.status === 'approved'));
});

test('addJournalEntry and getJournalEntries round-trip', async () => {
  const entry = await addJournalEntry('u-j', {
    title: 'Reflection 1',
    content: 'Learned something cool',
  }, { firebaseConfig: null });

  assert.equal(entry.title, 'Reflection 1');
  const all = await getJournalEntries('u-j', { firebaseConfig: null });
  assert.equal(all.length, 1);
  assert.equal(all[0].title, 'Reflection 1');
});

test('getAllLabRuns returns all recorded lab runs in local mode', async () => {
  await recordLabRun('u-all-1', { labId: 'w1-json-lab', passed: true, timestamp: '2026-11-01T00:00:00.000Z' }, { firebaseConfig: null });
  const allRuns = await getAllLabRuns({ firebaseConfig: null });
  assert.ok(allRuns.length >= 1);
  assert.ok(allRuns.some((r) => r.memberId === 'u-all-1'));
});

test('issueCertificate and getCertificate workflow in local mode', async () => {
  const cert = await issueCertificate({
    recipientUid: 'u-cert-1',
    recipientName: 'Ada Lovelace',
    tier: 'Distinction',
    trackName: 'AI & Prompt Engineering Track',
    faculty: 'Computing',
  }, { firebaseConfig: null });

  assert.ok(cert.certId);
  assert.equal(cert.recipientName, 'Ada Lovelace');
  assert.equal(cert.tier, 'Distinction');

  const fetched = await getCertificate(cert.certId, { firebaseConfig: null });
  assert.equal(fetched.certId, cert.certId);
  assert.equal(fetched.recipientName, 'Ada Lovelace');

  const memberCerts = await getMemberCertificates('u-cert-1', { firebaseConfig: null });
  assert.equal(memberCerts.length, 1);
  assert.equal(memberCerts[0].certId, cert.certId);

  const allCerts = await getAllCertificates({ firebaseConfig: null });
  assert.ok(allCerts.some((c) => c.certId === cert.certId));
});
