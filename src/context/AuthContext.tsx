import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { User } from "@/models/user";
import { getUserWithPasswordHashByUsername } from "@/repositories/userRepository";
import { verifyPassword } from "@/utils/password";

import { setCurrentUser } from "./authSession";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername) {
      throw new Error("Username is required.");
    }

    if (!password) {
      throw new Error("Password is required.");
    }

    setLoading(true);

    try {
      const userWithPassword =
        await getUserWithPasswordHashByUsername(cleanUsername);

      if (!userWithPassword) {
        throw new Error("Invalid username or password.");
      }

      if (!userWithPassword.isActive) {
        throw new Error(
          "This user account is inactive. Please contact an administrator.",
        );
      }

      const passwordMatches = await verifyPassword(
        password,
        userWithPassword.passwordHash,
      );

      if (!passwordMatches) {
        throw new Error("Invalid username or password.");
      }

      const authenticatedUser: User = {
        id: userWithPassword.id,
        fullName: userWithPassword.fullName,
        username: userWithPassword.username,
        role: userWithPassword.role,
        isActive: userWithPassword.isActive,
        createdAt: userWithPassword.createdAt,
        updatedAt: userWithPassword.updatedAt,
      };

      setCurrentUser(authenticatedUser);
      setUser(authenticatedUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      isAuthenticated: user !== null,
      isAdmin: user?.role === "admin",
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
