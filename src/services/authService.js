import crypto from "node:crypto";

const DEFAULT_SECRET = "dev-sqgs-auth-secret-change-in-prod";
const TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const KEY_LENGTH = 64;

function getSecret() {
  return process.env.AUTH_SECRET || DEFAULT_SECRET;
}

/**
 * Hashes a plain-text password using scrypt with a random 16-byte salt.
 * Stored format: "<saltHex>:<derivedKeyHex>"
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plain-text password against a stored "<salt>:<hash>" string
 * using timingSafeEqual to prevent timing attacks.
 */
export function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string") return false;
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;

  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;

  const storedKey = Buffer.from(keyHex, "hex");
  const derivedKey = crypto.scryptSync(password, salt, KEY_LENGTH);

  if (storedKey.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(derivedKey, storedKey);
}

/**
 * Signs a payload with HMAC-SHA256: "base64url(payload).signature"
 */
export function signToken(payload, { expiresInSeconds = TOKEN_TTL_SECONDS } = {}) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 token's signature and expiry.
 * Returns the decoded payload or null if invalid/expired.
 */
export function verifyToken(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Strips passwordHash before sending a customer object in API responses. */
export function sanitizeCustomer(customer) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? null,
    createdAt: customer.createdAt
  };
}