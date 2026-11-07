import { test } from 'node:test';
import assert from 'node:assert/strict';
import { determineCertificateTier, buildLinkedInCertUrl, renderCertificateView, renderPublicCertificateVerification } from './certificates.js';

test('determineCertificateTier requires passing all 7 curriculum labs', () => {
  const incomplete = determineCertificateTier({
    stats: { labsPassed: 5, totalLabs: 7 },
    milestones: [],
  });
  assert.equal(incomplete, null);

  const completed = determineCertificateTier({
    stats: { labsPassed: 7, totalLabs: 7 },
    milestones: [],
  });
  assert.equal(completed, 'Completion');
});

test('determineCertificateTier awards Distinction and Honors appropriately', () => {
  const distinction = determineCertificateTier({
    stats: { labsPassed: 7, totalLabs: 7 },
    milestones: [{ status: 'approved' }],
  });
  assert.equal(distinction, 'Distinction');

  const honorsRank = determineCertificateTier({
    stats: { labsPassed: 7, totalLabs: 7 },
    milestones: [],
    leaderboardRank: 3,
  });
  assert.equal(honorsRank, 'Honors');

  const honorsMilestone = determineCertificateTier({
    stats: { labsPassed: 7, totalLabs: 7 },
    milestones: [{ status: 'excellent' }],
    leaderboardRank: 15,
  });
  assert.equal(honorsMilestone, 'Honors');
});

test('renderCertificateView renders canvas and metadata', () => {
  const mountEl = {};
  renderCertificateView(mountEl, {
    certId: 'GDGOC-AI-123',
    recipientName: 'Ada Lovelace',
    tier: 'Distinction',
    issuedAt: Date.now(),
  }, { isOwner: true });

  assert.ok(mountEl.innerHTML.includes('Ada Lovelace'));
  assert.ok(mountEl.innerHTML.includes('GDGOC-AI-123'));
  assert.ok(mountEl.innerHTML.includes('Distinction'));
  assert.ok(mountEl.innerHTML.includes('cert-canvas'));
  assert.ok(mountEl.innerHTML.includes('Add to LinkedIn'));
});

test('renderPublicCertificateVerification shows not found state on null cert', () => {
  const mountEl = {};
  renderPublicCertificateVerification(mountEl, null);
  assert.ok(mountEl.innerHTML.includes('Certificate Not Found'));
});

test('renderPublicCertificateVerification renders verified credential details', () => {
  const mountEl = {};
  renderPublicCertificateVerification(mountEl, {
    certId: 'GDGOC-AI-VERIFIED',
    recipientName: 'Alan Turing',
    tier: 'Honors',
    recipientUid: 'turing-uid',
  });
  assert.ok(mountEl.innerHTML.includes('Official Verified Credential'));
  assert.ok(mountEl.innerHTML.includes('Alan Turing'));
  assert.ok(mountEl.innerHTML.includes('Honors'));
  assert.ok(mountEl.innerHTML.includes('#public/turing-uid'));
});

