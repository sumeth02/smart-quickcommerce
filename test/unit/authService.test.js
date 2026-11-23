import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  sanitizeCustomer
} from "../../src/services/authService.js";

describe("authService unit tests", () => {
  it("hashes and verifies a password with a unique salt per call", () => {
    const hash1 = hashPassword("superSecret123");
    const hash2 = hashPassword("superSecret123");

    expect(hash1).toContain(":");
    expect(hash1).not.toBe(hash2); // different random salts
    expect(verifyPassword("superSecret123", hash1)).toBe(true);
    expect(verifyPassword("wrongPassword", hash1)).toBe(false);
  });

  it("returns false for malformed password hashes or non-string inputs", () => {
    expect(verifyPassword("secret123", "not-a-valid-hash")).toBe(false);
    expect(verifyPassword("secret123", ":missingSalt")).toBe(false);
    expect(verifyPassword("secret123", "salt:abcd")).toBe(false); // wrong key length
    expect(verifyPassword(null, "salt:hash")).toBe(false);
  });

  it("signs and verifies a valid token", () => {
    const token = signToken({ id: 7, email: "joseph@example.com" });
    const payload = verifyToken(token);

    expect(payload).toMatchObject({ id: 7, email: "joseph@example.com" });
    expect(typeof payload.exp).toBe("number");
  });

  it("rejects tampered, malformed, or expired tokens", () => {
    const token = signToken({ id: 1, email: "a@b.com" });
    const [body, sig] = token.split(".");

    // Tampered payload
    const fakeBody = Buffer.from(JSON.stringify({ id: 999, exp: 9999999999 })).toString("base64url");
    expect(verifyToken(`${fakeBody}.${sig}`)).toBeNull();

    // Tampered signature
    expect(verifyToken(`${body}.invalidsignature`)).toBeNull();

    // Malformed / non-string
    expect(verifyToken("garbled")).toBeNull();
    expect(verifyToken("")).toBeNull();
    expect(verifyToken(12345)).toBeNull();

    // Expired token
    const expired = signToken({ id: 1 }, { expiresInSeconds: -10 });
    expect(verifyToken(expired)).toBeNull();
  });

  it("strips passwordHash in sanitizeCustomer", () => {
    const safe = sanitizeCustomer({
      id: 1,
      name: "Joseph",
      email: "joseph@example.com",
      phone: "0612345678",
      passwordHash: "salt:secret",
      createdAt: "2026-11-23T00:00:00.000Z"
    });

    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe.email).toBe("joseph@example.com");
  });
});