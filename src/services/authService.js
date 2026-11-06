import crypto from 'node:crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-secret-key';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, hash) {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function base64url(str) {
  return Buffer.from(str).toString('base64url').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = base64url(JSON.stringify({ ...payload, exp: Date.now() + 24 * 60 * 60 * 1000 }));
  
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(`${header}.${payloadStr}`)
    .digest('base64url');
    
  return `${header}.${payloadStr}.${signature}`;
}

export function verifyToken(token) {
  try {
    const [header, payloadStr, signature] = token.split('.');
    if (!header || !payloadStr || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(`${header}.${payloadStr}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;
    
    return payload;
  } catch {
    return null;
  }
}