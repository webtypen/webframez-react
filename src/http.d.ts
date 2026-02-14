import type { IncomingMessage, ServerResponse } from "node:http";

export type CreateNodeHandlerOptions = {
  distRootDir: string;
  pagesDir?: string;
  manifestPath?: string;
  assetsPrefix?: string;
  rscPath?: string;
  clientScriptUrl?: string;
  basePath?: string;
  liveReloadPath?: string | false;
};

export function createNodeRequestHandler(
  options: CreateNodeHandlerOptions
): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
