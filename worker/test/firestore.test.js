import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { makeFirestoreClient } from '../src/firestore.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const FAKE_SERVICE_ACCOUNT = {
  project_id: 'test-project',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  private_key: privateKey,
};

function mockFetchSequence(responses) {
  let call = 0;
  return test.mock.method(globalThis, 'fetch', async (url, init) => {
    const { status, body } = responses[call] ?? responses.at(-1);
    call += 1;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
      _requestUrl: url,
      _requestInit: init,
    };
  });
}

test('transactionalUpdate sends a bare resource-path name, not the request URL, to :commit', async () => {
  const fetchMock = mockFetchSequence([
    { status: 200, body: { access_token: 'fake-token', expires_in: 3600 } }, // oauth2 token
    { status: 200, body: { transaction: 'txn-123' } }, // beginTransaction
    { status: 404, body: {} }, // get (no existing doc)
    { status: 200, body: {} }, // commit
  ]);

  const firestore = makeFirestoreClient(FAKE_SERVICE_ACCOUNT);
  await firestore.transactionalUpdate('apiUsage/uid1', () => ({ tokensToday: 10 }));

  const commitCall = fetchMock.mock.calls[3];
  const commitBody = JSON.parse(commitCall.arguments[1].body);
  const name = commitBody.writes[0].update.name;

  assert.equal(name, 'projects/test-project/databases/(default)/documents/apiUsage/uid1');
  assert.ok(!name.startsWith('https://'), 'document name must be a bare resource path, not a request URL');
});
