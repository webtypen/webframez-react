import type { AuthContext, Model } from "@webtypen/webframez-core";
import type { RouteRequestContext } from "./types";

export declare function getAuth<TUser extends Model = Model>(context: { request: RouteRequestContext }): AuthContext<TUser> | null;
