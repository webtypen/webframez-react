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
  extends Partial<CreateNodeHandlerOptions> {
  srcPath?: string;
  clientEntryPath?: string;
  styleSrcPath?: string;
  method?: WebframezCoreRouteMethod | WebframezCoreRouteMethod[];
  routeOptions?: WebframezCoreRouteRegistrationOptions;
}

export type WebframezReactBuildTarget = {
  path: string;
  routePath: string;
  routeKey: string;
  srcPath: string;
  distRootDir: string;
  pagesDir: string;
  manifestPath: string;
  assetsPrefix?: string;
  rscPath?: string;
  clientScriptUrl?: string;
  clientEntryPath?: string;
  styleSrcPath?: string;
};

export interface WebframezCoreRouteFacadeExtensions {
  renderReact(path: string, options?: WebframezCoreReactRenderRouteOptions): void;
  reactRender(path: string, options?: WebframezCoreReactRenderRouteOptions): void;
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
export function resolveWebframezReactRouteOptions(
  path: string,
  options?: WebframezCoreReactRenderRouteOptions,
): CreateNodeHandlerOptions & WebframezReactBuildTarget;
export function getRegisteredReactBuildTargets(): WebframezReactBuildTarget[];
export function clearRegisteredReactBuildTargets(): void;
