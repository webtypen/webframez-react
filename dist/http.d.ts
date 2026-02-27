import type { IncomingMessage, ServerResponse } from "node:http";

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
}

export function createNodeRequestHandler(
  options: CreateNodeHandlerOptions
): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
