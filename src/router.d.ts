import type { ReactNode } from "react";
import type {
  HeadConfig,
  RouteContext,
  RouteDataHook,
  RouteRequestContext,
  RouteSearchParams,
} from "./types";

export type ResolvedRoute = {
  statusCode: number;
  model: ReactNode;
  head: HeadConfig;
  context: RouteContext;
  contextModel?: ReactNode;
  pageModel?: ReactNode;
};

export function createFileRouter(options: { pagesDir: string; onData?: RouteDataHook; onError?: (error: unknown, context: RouteContext) => boolean | void | Promise<boolean | void> }): {
  resolve(input: {
    pathname: string;
    searchParams: RouteSearchParams;
    cookies?: Record<string, string>;
    request?: RouteRequestContext;
  }): Promise<ResolvedRoute>;
  resolveError(context: RouteContext, statusCode: number, message: string, payload?: unknown): Promise<ResolvedRoute>;
  readSearchParams(urlSearchParams: URLSearchParams): RouteSearchParams;
};

export function parseSearchParams(query: URLSearchParams): RouteSearchParams;
export function renderHeadToString(head: HeadConfig): string;
export function RouteChildren(): ReactNode;
