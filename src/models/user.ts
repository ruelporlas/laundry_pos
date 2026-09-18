export type UserRole = "admin" | "staff";

export type User = {
  id: number;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserWithPasswordHash = User & {
  passwordHash: string;
};

export type CreateUserInput = {
  fullName: string;
  username: string;
  passwordHash: string;
  role: UserRole;
};

export type UpdateUserInput = {
  fullName: string;
  username: string;
  role: UserRole;
};

export type ChangeUserPasswordInput = {
  passwordHash: string;
};
