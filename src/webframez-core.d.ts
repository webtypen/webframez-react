import type { RouteFacade } from "@webtypen/webframez-core";
import type { CreateNodeHandlerOptions } from "./http";

export type WebframezCoreRouteMethod = "GET" | "POST" | "PUT" | "DELETE";

export type WebframezCoreReactRenderRouteOptions = CreateNodeHandlerOptions & {
  method?: WebframezCoreRouteMethod | WebframezCoreRouteMethod[];
  routeOptions?: Record<string, any>;
};

declare module "@webtypen/webframez-core" {
  interface RouteFacade {
    renderReact(path: string, options: WebframezCoreReactRenderRouteOptions): void;
    reactRender(path: string, options: WebframezCoreReactRenderRouteOptions): void;
  }
}

export function initWebframezReact(route: RouteFacade): RouteFacade;
export const setupWebframezCoreReactRoute: typeof initWebframezReact;
