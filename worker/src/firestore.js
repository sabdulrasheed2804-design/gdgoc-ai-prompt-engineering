import { SignJWT, importPKCS8 } from 'jose';

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedTokenExpiry - 60) return cachedToken;

  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/datastore' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Google access token: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = now + data.expires_in;
  return cachedToken;
}

// Converts a plain JS object (string/number/boolean values only, as needed
// by this project) to Firestore REST API's typed field format.
export function toFirestoreFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') fields[key] = { stringValue: value };
    else if (typeof value === 'boolean') fields[key] = { booleanValue: value };
    else if (typeof value === 'number' && Number.isInteger(value)) fields[key] = { integerValue: String(value) };
    else if (typeof value === 'number') fields[key] = { doubleValue: value };
    else throw new Error(`Unsupported Firestore field type for ${key}`);
  }
  return { fields };
}

// Converts Firestore REST API's typed field format back to a plain JS object.
export function fromFirestoreFields(document) {
  const obj = {};
  for (const [key, value] of Object.entries(document?.fields ?? {})) {
    if ('stringValue' in value) obj[key] = value.stringValue;
    else if ('booleanValue' in value) obj[key] = value.booleanValue;
    else if ('integerValue' in value) obj[key] = Number(value.integerValue);
    else if ('doubleValue' in value) obj[key] = value.doubleValue;
  }
  return obj;
}

export function makeFirestoreClient(serviceAccount) {
  const base = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents`;

  async function authedFetch(path, init = {}) {
    const token = await getAccessToken(serviceAccount);
    return fetch(`${base}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
  }

  return {
    async getDocument(path) {
      const response = await authedFetch(`/${path}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Firestore getDocument failed: ${response.status} ${await response.text()}`);
      return fromFirestoreFields(await response.json());
    },

    async createDocument(collectionPath, data) {
      const response = await authedFetch(`/${collectionPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toFirestoreFields(data)),
      });
      if (!response.ok) throw new Error(`Firestore createDocument failed: ${response.status} ${await response.text()}`);
    },

    // Reads the document at `path` and writes `computeNext(currentDataOrNull)`
    // back to it inside a real Firestore transaction, so concurrent callers
    // never lose each other's updates (Firestore retries on conflict).
    async transactionalUpdate(path, computeNext) {
      const beginRes = await authedFetch(':beginTransaction', { method: 'POST', body: '{}' });
      if (!beginRes.ok) throw new Error(`Firestore beginTransaction failed: ${beginRes.status}`);
      const { transaction } = await beginRes.json();

      const getRes = await authedFetch(`/${path}?transaction=${encodeURIComponent(transaction)}`);
      const current = getRes.status === 404 ? null : fromFirestoreFields(await getRes.json());
      const next = computeNext(current);

      const commitRes = await authedFetch(':commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction,
          writes: [{ update: { name: `${base}/${path}`, ...toFirestoreFields(next) } }],
        }),
      });
      if (!commitRes.ok) throw new Error(`Firestore commit failed: ${commitRes.status} ${await commitRes.text()}`);
      return next;
    },
  };
}
