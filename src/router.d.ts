import type { ReactNode } from "react";
import type { HeadConfig, RouteSearchParams } from "./types";

export type ResolvedRoute = {
  statusCode: number;
  model: ReactNode;
  head: HeadConfig;
};

export function createFileRouter(options: { pagesDir: string }): {
  resolve(input: {
    pathname: string;
    searchParams: RouteSearchParams;
    cookies?: Record<string, string>;
  }): Promise<ResolvedRoute>;
  readSearchParams(urlSearchParams: URLSearchParams): RouteSearchParams;
};

export function parseSearchParams(query: URLSearchParams): RouteSearchParams;
export function renderHeadToString(head: HeadConfig): string;
export function RouteChildren(): ReactNode;
