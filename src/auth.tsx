"use client";

import React from "react";
import type { AuthSnapshot } from "@webtypen/webframez-core";

export type ClientAuth<TUser = Record<string, unknown>> = {
  user: TUser | null;
  session: AuthSnapshot["session"] | null;
  isAuthenticated: boolean;
};

const anonymous: ClientAuth = { user: null, session: null, isAuthenticated: false };
// SSR may load ESM client references alongside CommonJS application modules.
const authRuntime = globalThis as typeof globalThis & { __WEBFRAMEZ_AUTH_CONTEXT__?: React.Context<ClientAuth> };
const AuthContext = typeof React.createContext === "function"
  ? (authRuntime.__WEBFRAMEZ_AUTH_CONTEXT__ ||= React.createContext<ClientAuth>(anonymous))
  : null;

export function AuthProvider({ auth, children }: { auth: AuthSnapshot | null; children: React.ReactNode }) {
  const value = auth ? { ...auth, isAuthenticated: true } : anonymous;
  if (!AuthContext) return <>{children}</>;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Read the safe snapshot injected by the React route's server-side auth resolver. */
export function useAuth<TUser = Record<string, unknown>>(): ClientAuth<TUser> {
  return (AuthContext ? React.useContext(AuthContext) : anonymous) as ClientAuth<TUser>;
}
