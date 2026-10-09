import * as bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";

const SALT_ROUNDS = 10;

bcrypt.setRandomFallback((length: number) => {
  return Array.from(Crypto.getRandomBytes(length));
});

export async function hashPassword(password: string): Promise<string> {
  const cleanPassword = String(password);

  if (!cleanPassword.trim()) {
    throw new Error("Password is required.");
  }

  return bcrypt.hash(cleanPassword, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }

  return bcrypt.compare(String(password), String(passwordHash));
}
