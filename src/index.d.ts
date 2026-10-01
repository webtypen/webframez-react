import type { AuthContext, Model } from "@webtypen/webframez-core";
import type { RouteRequestContext } from "./types";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreateHtmlShellOptions, SendRSCOptions } from "./types";
import type { CreateNodeHandlerOptions } from "./http";
import "./webframez-core";

export * from "./types";
export { createFileRouter, parseSearchParams, renderHeadToString, RouteChildren } from "./router";
export type { ResolvedRoute } from "./router";
export * from "./webframez-core";

export function createHTMLShell(options?: CreateHtmlShellOptions): string;
export function sendRSC(
  res: ServerResponse,
  model: unknown,
  options?: SendRSCOptions
): unknown;

export function createRSCHandler(options: {
  rscPath?: string;
  getModel: (req: IncomingMessage) => Promise<unknown> | unknown;
  moduleMap?: Record<string, unknown>;
  onError?: (error: unknown) => void;
}): (req: IncomingMessage, res: ServerResponse) => Promise<boolean>;

export function createNodeRequestHandler(
  options: CreateNodeHandlerOptions
): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export { renderReactToHtml, disposeReactHtmlRenderer } from "./http";

export declare function getAuth<TUser extends Model = Model>(context: { request: RouteRequestContext }): AuthContext<TUser> | null;
