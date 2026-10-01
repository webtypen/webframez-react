import type { ReactNode } from "react";
import type { AuthSnapshot } from "@webtypen/webframez-core";

export type ClientAuth<TUser = Record<string, unknown>> = {
  user: TUser | null;
  session: AuthSnapshot["session"] | null;
  isAuthenticated: boolean;
};

export declare function AuthProvider(props: { auth: AuthSnapshot | null; children: ReactNode }): ReactNode;
export declare function useAuth<TUser = Record<string, unknown>>(): ClientAuth<TUser>;
