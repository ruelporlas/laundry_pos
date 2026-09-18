import { getDatabase } from "@/database/database";
import {
    CreateUserInput,
    UpdateUserInput,
    User,
    UserWithPasswordHash,
} from "@/models/user";

type UserRow = {
  id: number;
  full_name: string;
  username: string;
  password_hash: string;
  role: "admin" | "staff";
  is_active: number;
  created_at: string;
  updated_at: string;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role: row.role,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserWithPasswordHash(row: UserRow): UserWithPasswordHash {
  return {
    ...mapUserRow(row),
    passwordHash: row.password_hash,
  };
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateUserInput(input: CreateUserInput): void {
  if (!input.fullName.trim()) {
    throw new Error("Full name is required.");
  }

  if (!input.username.trim()) {
    throw new Error("Username is required.");
  }

  if (!input.passwordHash.trim()) {
    throw new Error("Password is required.");
  }
}

function validateUpdateInput(input: UpdateUserInput): void {
  if (!input.fullName.trim()) {
    throw new Error("Full name is required.");
  }

  if (!input.username.trim()) {
    throw new Error("Username is required.");
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  validateUserInput(input);

  const db = await getDatabase();

  const username = normalizeUsername(input.username);
  const now = new Date().toISOString();

  try {
    const result = await db.runAsync(
      `
        INSERT INTO users (
          full_name,
          username,
          password_hash,
          role,
          is_active,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 1, ?, ?);
      `,
      input.fullName.trim(),
      username,
      input.passwordHash,
      input.role,
      now,
      now,
    );

    const user = await getUserById(Number(result.lastInsertRowId));

    if (!user) {
      throw new Error("The user was created but could not be loaded.");
    }

    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new Error("That username is already in use.");
    }

    throw error;
  }
}

export async function getUsers(): Promise<User[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<UserRow>(
    `
      SELECT
        id,
        full_name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      ORDER BY full_name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapUserRow);
}

export async function getActiveUsers(): Promise<User[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<UserRow>(
    `
      SELECT
        id,
        full_name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE is_active = 1
      ORDER BY full_name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapUserRow);
}

export async function getUserById(userId: number): Promise<User | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<UserRow>(
    `
      SELECT
        id,
        full_name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE id = ?
      LIMIT 1;
    `,
    userId,
  );

  return row ? mapUserRow(row) : null;
}

export async function getUserWithPasswordHashByUsername(
  username: string,
): Promise<UserWithPasswordHash | null> {
  const db = await getDatabase();

  const normalizedUsername = normalizeUsername(username);

  const row = await db.getFirstAsync<UserRow>(
    `
      SELECT
        id,
        full_name,
        username,
        password_hash,
        role,
        is_active,
        created_at,
        updated_at
      FROM users
      WHERE username = ?
      LIMIT 1;
    `,
    normalizedUsername,
  );

  return row ? mapUserWithPasswordHash(row) : null;
}

export async function updateUser(
  userId: number,
  input: UpdateUserInput,
): Promise<User> {
  validateUpdateInput(input);

  const db = await getDatabase();

  const username = normalizeUsername(input.username);
  const now = new Date().toISOString();

  try {
    const result = await db.runAsync(
      `
        UPDATE users
        SET
          full_name = ?,
          username = ?,
          role = ?,
          updated_at = ?
        WHERE id = ?;
      `,
      input.fullName.trim(),
      username,
      input.role,
      now,
      userId,
    );

    if (result.changes === 0) {
      throw new Error("The user could not be found.");
    }

    const user = await getUserById(userId);

    if (!user) {
      throw new Error("The user was updated but could not be loaded.");
    }

    return user;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("unique")
    ) {
      throw new Error("That username is already in use.");
    }

    throw error;
  }
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  if (!passwordHash.trim()) {
    throw new Error("Password is required.");
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `
      UPDATE users
      SET
        password_hash = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    passwordHash,
    new Date().toISOString(),
    userId,
  );

  if (result.changes === 0) {
    throw new Error("The user could not be found.");
  }
}

export async function deactivateUser(userId: number): Promise<User> {
  return setUserActiveState(userId, false);
}

export async function activateUser(userId: number): Promise<User> {
  return setUserActiveState(userId, true);
}

async function setUserActiveState(
  userId: number,
  isActive: boolean,
): Promise<User> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `
      UPDATE users
      SET
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `,
    isActive ? 1 : 0,
    new Date().toISOString(),
    userId,
  );

  if (result.changes === 0) {
    throw new Error("The user could not be found.");
  }

  const user = await getUserById(userId);

  if (!user) {
    throw new Error(
      "The user's status was updated but the user could not be loaded.",
    );
  }

  return user;
}
