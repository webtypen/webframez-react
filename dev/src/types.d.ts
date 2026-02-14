import type { WebframezCoreReactRenderRouteOptions } from "webframez-react";

declare module "@webtypen/webframez-core" {
  interface RouteFacade {
    renderReact(path: string, options: WebframezCoreReactRenderRouteOptions): void;
  }
}

declare global {
  interface Window {
    __RSC_ENDPOINT?: string;
  }
}

export {};
