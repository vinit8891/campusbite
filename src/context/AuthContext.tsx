"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AUTH_STORAGE_KEYS,
  clearAuthForRole,
  decodeJwtPayload,
} from "@/lib/authTokens";
import type { User } from "@/types";

export type { User };

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

function userFromToken(token: string, fallback?: Partial<User>): User {
  const payload = decodeJwtPayload(token);

  const email =
    (payload?.email as string | undefined) ||
    fallback?.email ||
    "";

  const name =
    (payload?.full_name as string | undefined) ||
    fallback?.name ||
    (email ? email.split("@")[0] : "Customer");

  const phone =
    (payload?.phone as string | undefined) ||
    fallback?.phone;

  return {
    name,
    email,
    phone,
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(
      AUTH_STORAGE_KEYS.customerToken
    );

    const savedUser = localStorage.getItem(
      AUTH_STORAGE_KEYS.customerUser
    );

    if (!savedToken) return;

    const parsedUser = savedUser
      ? (JSON.parse(savedUser) as User)
      : undefined;

    const hydrated = userFromToken(savedToken, parsedUser);

    setToken(savedToken);
    setUser(hydrated);
    localStorage.setItem(
      AUTH_STORAGE_KEYS.customerUser,
      JSON.stringify(hydrated)
    );
  }, []);

  const login = useCallback((userData: User, jwtToken: string) => {
    const hydrated = userFromToken(jwtToken, userData);

    setUser(hydrated);
    setToken(jwtToken);

    localStorage.setItem(
      AUTH_STORAGE_KEYS.customerUser,
      JSON.stringify(hydrated)
    );

    localStorage.setItem(
      AUTH_STORAGE_KEYS.customerToken,
      jwtToken
    );
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthForRole("customer");
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isLoggedIn: !!token,
    }),
    [user, token, login, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
