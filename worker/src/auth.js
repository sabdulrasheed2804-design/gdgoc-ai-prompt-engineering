import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwks;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
  return jwks;
}

export class AuthError extends Error {}

export async function verifyIdToken(idToken, projectId) {
  if (!idToken) throw new AuthError('Missing ID token');
  try {
    const { payload } = await jwtVerify(idToken, getJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    if (!payload.sub) throw new AuthError('ID token missing subject');
    return { uid: payload.sub };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError(`Invalid ID token: ${err.message}`);
  }
}
