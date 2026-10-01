"use client";

import React from "react";
import type { AuthSnapshot } from "@webtypen/webframez-core";

export type ClientAuth<TUser = Record<string, unknown>> = {
  user: TUser | null;
  session: AuthSnapshot["session"] | null;
  isAuthenticated: boolean;
};

const anonymous: ClientAuth = { user: null, session: null, isAuthenticated: false };
const AuthContext = typeof React.createContext === "function" ? React.createContext<ClientAuth>(anonymous) : null;

export function AuthProvider({ auth, children }: { auth: AuthSnapshot | null; children: React.ReactNode }) {
  const value = auth ? { ...auth, isAuthenticated: true } : anonymous;
  if (!AuthContext) return <>{children}</>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the safe snapshot injected by the React route's server-side auth resolver. */
export function useAuth<TUser = Record<string, unknown>>(): ClientAuth<TUser> {
  return (AuthContext ? React.useContext(AuthContext) : anonymous) as ClientAuth<TUser>;
}
