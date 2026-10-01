import type { AuthContext, Model } from "@webtypen/webframez-core";
import type { RouteRequestContext } from "./types";

/** Auth is loaded before page data, layouts and server components are resolved. */
export function getAuth<TUser extends Model = Model>(context: { request: RouteRequestContext }): AuthContext<TUser> | null {
  return (context.request?.auth as AuthContext<TUser> | null | undefined) ?? null;
}
