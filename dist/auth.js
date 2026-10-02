"use client";

// src/auth.tsx
import React from "react";
import { Fragment, jsx } from "react/jsx-runtime";
var anonymous = { user: null, session: null, isAuthenticated: false };
var authRuntime = globalThis;
var AuthContext = typeof React.createContext === "function" ? authRuntime.__WEBFRAMEZ_AUTH_CONTEXT__ ||= React.createContext(anonymous) : null;
function AuthProvider({ auth, children }) {
  const value = auth ? { ...auth, isAuthenticated: true } : anonymous;
  if (!AuthContext)
    return /* @__PURE__ */ jsx(Fragment, { children });
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  return AuthContext ? React.useContext(AuthContext) : anonymous;
}
export {
  AuthProvider,
  useAuth
};
