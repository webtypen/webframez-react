import fs from "node:fs";
import path from "node:path";
import React from "react";
import { injectRouteChildren } from "./router-runtime";
import type {
  AbortRouteOptions,
  ErrorModule,
  ErrorPageProps,
  HeadConfig,
  LayoutModule,
  PageModule,
  RouteContext,
  RouteParams,
  RouteSearchParams,
} from "./types";

type RouteEntry = {
  filePath: string;
  segments: string[];
  staticCount: number;
};

type ResolveInput = {
  pathname: string;
  searchParams: RouteSearchParams;
  cookies?: Record<string, string>;
};

type RouteAbort = {
  __webframezRouteAbort: true;
  statusCode: number;
  message: string;
  payload?: unknown;
};

export type ResolvedRoute = {
  statusCode: number;
  model: React.ReactNode;
  head: HeadConfig;
};

function normalizePathname(pathname: string) {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function splitSegments(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") {
    return [];
  }

  return normalized.slice(1).split("/").filter(Boolean);
}

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const result: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }

  return result;
}

function readSearchParams(urlSearchParams: URLSearchParams): RouteSearchParams {
  const output: RouteSearchParams = {};

  for (const key of urlSearchParams.keys()) {
    const values = urlSearchParams.getAll(key);
    output[key] = values.length <= 1 ? (values[0] ?? "") : values;
  }

  return output;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toRouteEntry(pagesDir: string, filePath: string): RouteEntry | null {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.endsWith("/index.js")) {
    return null;
  }

  const relativeDir = path
    .dirname(path.relative(pagesDir, filePath))
    .replace(/\\/g, "/");
  const segments = relativeDir === "." ? [] : relativeDir.split("/").filter(Boolean);
  const staticCount = segments.filter((segment) => !segment.startsWith("[")).length;

  return {
    filePath,
    segments,
    staticCount,
  };
}

function matchRoute(entry: RouteEntry, pathname: string): RouteParams | null {
  const targetSegments = splitSegments(pathname);
  if (entry.segments.length !== targetSegments.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let index = 0; index < entry.segments.length; index += 1) {
    const routeSegment = entry.segments[index];
    const targetSegment = targetSegments[index];

    if (routeSegment.startsWith("[") && routeSegment.endsWith("]")) {
      const paramName = routeSegment.slice(1, -1);
      if (!paramName) {
        return null;
      }
      params[paramName] = decodeURIComponent(targetSegment);
      continue;
    }

    if (routeSegment !== targetSegment) {
      return null;
    }
  }

  return params;
}

function mergeHead(...configs: Array<HeadConfig | undefined>) {
  const merged: HeadConfig = {
    meta: [],
    links: [],
  };

  for (const config of configs) {
    if (!config) {
      continue;
    }

    if (config.title) {
      merged.title = config.title;
    }
    if (config.description) {
      merged.description = config.description;
    }
    if (config.favicon) {
      merged.favicon = config.favicon;
    }
    if (config.meta) {
      merged.meta?.push(...config.meta);
    }
    if (config.links) {
      merged.links?.push(...config.links);
    }
  }

  return merged;
}

export function renderHeadToString(head: HeadConfig) {
  const tags: string[] = [];

  if (head.description) {
    tags.push(
      `<meta name=\"description\" content=\"${escapeHtml(head.description)}\" />`
    );
  }

  if (head.favicon) {
    tags.push(`<link rel=\"icon\" href=\"${escapeHtml(head.favicon)}\" />`);
  }

  for (const meta of head.meta ?? []) {
    const attrs = Object.entries(meta)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}=\"${escapeHtml(String(value))}\"`)
      .join(" ");
    tags.push(`<meta ${attrs} />`);
  }

  for (const link of head.links ?? []) {
    const attrs = Object.entries(link)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}=\"${escapeHtml(String(value))}\"`)
      .join(" ");
    tags.push(`<link ${attrs} />`);
  }

  return tags.join("\n");
}

function resolveModule<T>(modulePath: string): T {
  delete require.cache[modulePath];
  return require(modulePath) as T;
}

async function resolveHead<TContext extends RouteContext | ErrorPageProps>(
  candidate: { Head?: (context: TContext) => HeadConfig | Promise<HeadConfig> },
  context: TContext
) {
  if (!candidate.Head) {
    return undefined;
  }

  return candidate.Head(context);
}

function findBestMatch(entries: RouteEntry[], pathname: string) {
  const matches: Array<{ entry: RouteEntry; params: RouteParams }> = [];

  for (const entry of entries) {
    const params = matchRoute(entry, pathname);
    if (params) {
      matches.push({ entry, params });
    }
  }

  matches.sort((a, b) => {
    if (b.entry.staticCount !== a.entry.staticCount) {
      return b.entry.staticCount - a.entry.staticCount;
    }
    return b.entry.segments.length - a.entry.segments.length;
  });

  return matches[0] ?? null;
}

function normalizeAbortStatus(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 404;
  }

  const normalized = Math.trunc(value);
  if (normalized < 100 || normalized > 599) {
    return 404;
  }

  return normalized;
}

function createAbort(options?: AbortRouteOptions): RouteAbort {
  return {
    __webframezRouteAbort: true,
    statusCode: normalizeAbortStatus(options?.status),
    message: options?.message?.trim() || "Page not found",
    payload: options?.payload,
  };
}

function isRouteAbort(value: unknown): value is RouteAbort {
  if (!value || typeof value !== "object") {
    return false;
  }

  try {
    return (value as RouteAbort).__webframezRouteAbort === true;
  } catch {
    return false;
  }
}

export function createFileRouter(options: { pagesDir: string }) {
  const pagesDir = options.pagesDir;
  const layoutPath = path.join(pagesDir, "layout.js");
  const errorPath = path.join(pagesDir, "errors.js");

  function buildRouteEntries() {
    const files = walkFiles(pagesDir);
    return files
      .map((filePath) => toRouteEntry(pagesDir, filePath))
      .filter((entry): entry is RouteEntry => entry !== null)
      .sort((a, b) => {
        if (b.staticCount !== a.staticCount) {
          return b.staticCount - a.staticCount;
        }
        return b.segments.length - a.segments.length;
      });
  }

  async function renderError(
    context: RouteContext,
    statusCode: number,
    message: string,
    payload?: unknown
  ): Promise<ResolvedRoute> {
    const errorProps: ErrorPageProps = {
      ...context,
      statusCode,
      message,
      payload,
    };

    const layoutModule = fs.existsSync(layoutPath)
      ? resolveModule<LayoutModule>(layoutPath)
      : null;

    if (!fs.existsSync(errorPath)) {
      const fallback = (
        <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
          <h1>{statusCode}</h1>
          <p>{message}</p>
        </main>
      );

      return {
        statusCode,
        model: fallback,
        head: {
          title: `${statusCode} - ${message}`,
        },
      };
    }

    const errorModule = resolveModule<ErrorModule>(errorPath);
    const errorNode = errorModule.default(errorProps);

    const layoutHead = layoutModule
      ? await resolveHead(layoutModule, context)
      : undefined;
    const errorHead = await resolveHead(errorModule, errorProps);

    const model = layoutModule
      ? injectRouteChildren(layoutModule.default(context), errorNode)
      : errorNode;

    return {
      statusCode,
      model,
      head: mergeHead(layoutHead, errorHead),
    };
  }

  async function resolve(input: ResolveInput): Promise<ResolvedRoute> {
    const pathname = normalizePathname(input.pathname);
    const contextBase: RouteContext = {
      pathname,
      params: {},
      searchParams: input.searchParams,
      cookies: input.cookies ?? {},
      abort: (options?: AbortRouteOptions) => {
        throw createAbort(options);
      },
    };
    let activeContext: RouteContext = contextBase;

    try {
      const entries = buildRouteEntries();
      const match = findBestMatch(entries, pathname);

      if (!match) {
        return renderError(contextBase, 404, "Page not found");
      }

      const context: RouteContext = {
        ...contextBase,
        params: match.params,
      };
      activeContext = context;

      const pageModule = resolveModule<PageModule>(match.entry.filePath);
      const layoutModule = fs.existsSync(layoutPath)
        ? resolveModule<LayoutModule>(layoutPath)
        : null;

      const pageNode = pageModule.default(context);
      const layoutHead = layoutModule
        ? await resolveHead(layoutModule, context)
        : undefined;
      const pageHead = await resolveHead(pageModule, context);

      const model = layoutModule
        ? injectRouteChildren(layoutModule.default(context), pageNode)
        : pageNode;

      return {
        statusCode: 200,
        model,
        head: mergeHead(layoutHead, pageHead),
      };
    } catch (error) {
      if (isRouteAbort(error)) {
        return renderError(activeContext, error.statusCode, error.message, error.payload);
      }
      console.error("[webframez-react] Failed to resolve route", error);
      return renderError(contextBase, 500, "Internal server error");
    }
  }

  return {
    resolve,
    readSearchParams,
  };
}

export function parseSearchParams(query: URLSearchParams): RouteSearchParams {
  return readSearchParams(query);
}
