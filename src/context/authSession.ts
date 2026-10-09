import type { User } from "@/models/user";

let currentUser: User | null = null;

export function setCurrentUser(user: User | null): void {
  currentUser = user;
}

export function getCurrentUser(): User | null {
  return currentUser;
}
