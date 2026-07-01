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

export function createFileRouter(options: { pagesDir: string; onData?: RouteDataHook }): {
  resolve(input: {
    pathname: string;
    searchParams: RouteSearchParams;
    cookies?: Record<string, string>;
    request?: RouteRequestContext;
  }): Promise<ResolvedRoute>;
  readSearchParams(urlSearchParams: URLSearchParams): RouteSearchParams;
};

export function parseSearchParams(query: URLSearchParams): RouteSearchParams;
export function renderHeadToString(head: HeadConfig): string;
export function RouteChildren(): ReactNode;
