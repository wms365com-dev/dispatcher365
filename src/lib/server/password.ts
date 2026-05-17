import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const PASSWORD_KEY_LENGTH = 64;

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  if (isLegacyBcryptHash(storedHash)) {
    return verifyLegacyBcryptHash(password, storedHash);
  }

  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const actual = Buffer.from(scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex"), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export function isLegacyBcryptHash(storedHash?: string | null) {
  return Boolean(storedHash && /^\$2[aby]\$/.test(storedHash));
}

export function verifyLegacyBcryptHash(password: string, storedHash: string) {
  const normalizedHash = storedHash.replace(/^\$2y\$/, "$2b$");

  try {
    return bcrypt.compareSync(password, normalizedHash);
  } catch {
    return false;
  }
}
