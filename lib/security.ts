import { createHash, randomBytes } from "crypto";

const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generatePassword(length = 12): string {
  const bytes = randomBytes(length);
  let result = "";

  for (let i = 0; i < length; i += 1) {
    result += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }

  return result;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
