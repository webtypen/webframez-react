import type { RouteFacade } from "@webtypen/webframez-core";
import type { CreateNodeHandlerOptions } from "./http";

export type WebframezCoreRouteMethod = "GET" | "POST" | "PUT" | "DELETE";
export type WebframezCoreRouteMiddleware = string | string[];

export interface WebframezCoreRouteRegistrationOptions {
  middleware?: WebframezCoreRouteMiddleware;
  domains?: string | string[];
  [key: string]: unknown;
}

export interface WebframezCoreReactRenderRouteOptions
  extends CreateNodeHandlerOptions {
  method?: WebframezCoreRouteMethod | WebframezCoreRouteMethod[];
  routeOptions?: WebframezCoreRouteRegistrationOptions;
}

export interface WebframezCoreRouteFacadeExtensions {
  renderReact(path: string, options: WebframezCoreReactRenderRouteOptions): void;
  reactRender(path: string, options: WebframezCoreReactRenderRouteOptions): void;
}

declare module "@webtypen/webframez-core" {
  interface RouteFacade extends WebframezCoreRouteFacadeExtensions {}
}

declare module "webframez-core" {
  interface RouteFacade extends WebframezCoreRouteFacadeExtensions {}
}

declare module "@webtypen/webframez-core/dist/Router/Route" {
  interface RouteFacade extends WebframezCoreRouteFacadeExtensions {}
}

declare module "webframez-core/dist/Router/Route" {
  interface RouteFacade extends WebframezCoreRouteFacadeExtensions {}
}

export function initWebframezReact<T extends RouteFacade>(
  route: T,
): T & WebframezCoreRouteFacadeExtensions;
export const setupWebframezCoreReactRoute: typeof initWebframezReact;
