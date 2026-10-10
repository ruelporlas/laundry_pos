import { getDatabase } from "@/database/database";
import { createUser } from "@/repositories/userRepository";
import { hashPassword } from "@/utils/password";

const DEFAULT_ADMIN = {
  fullName: "Default Administrator",
  username: "default-admin",
  password: "default-adminpassword654321!",
  role: "admin" as const,
};

/**
 * Creates the default administrator only when no user accounts exist.
 *
 * This supports both a fresh installation and an existing installation
 * whose users table is still empty. It never resets or overwrites an
 * existing user's credentials.
 */
export async function seedDefaultAdmin(): Promise<void> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users;",
  );

  if ((result?.count ?? 0) > 0) {
    return;
  }

  const passwordHash = await hashPassword(DEFAULT_ADMIN.password);

  // Recheck immediately before insertion in case initialization overlaps.
  const latestResult = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM users;",
  );

  if ((latestResult?.count ?? 0) > 0) {
    return;
  }

  await createUser({
    fullName: DEFAULT_ADMIN.fullName,
    username: DEFAULT_ADMIN.username,
    passwordHash,
    role: DEFAULT_ADMIN.role,
  });

  console.log("Default administrator account created.");
}
