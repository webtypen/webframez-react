import type { AuthScope, Request } from "@webtypen/webframez-core";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteDataHook } from "./types";

export type WebframezReactRoutePath = `/${string}` | "/";
export type WebframezReactAssetsPrefix = `${WebframezReactRoutePath}/` | "/";

export interface CreateNodeHandlerPathsOptions {
  distRootDir: string;
  pagesDir?: string;
  manifestPath?: string;
}

export interface CreateNodeHandlerRoutingOptions {
  assetsPrefix?: WebframezReactAssetsPrefix;
  rscPath?: WebframezReactRoutePath;
  clientScriptUrl?: WebframezReactRoutePath;
  basePath?: WebframezReactRoutePath;
  liveReloadPath?: WebframezReactRoutePath | false;
}

export interface CreateNodeHandlerOptions
  extends CreateNodeHandlerPathsOptions,
    CreateNodeHandlerRoutingOptions {
  onData?: RouteDataHook;
  /** Return true when the host has recorded this error separately. */
  onError?: (error: unknown, context: import("./types").RouteContext) => boolean | void | Promise<boolean | void>;
  auth?: string | AuthScope | (() => AuthScope);
}

export function createNodeRequestHandler(
  options: CreateNodeHandlerOptions
): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function renderReactToHtml(element: unknown): Promise<string>;
export function disposeReactHtmlRenderer(): void;
