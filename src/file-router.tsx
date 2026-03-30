import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import React from "react";
import { normalizeHeadConfig } from "./head";
import { injectRouteChildren } from "./router-runtime";
import type {
  AbortRouteOptions,
  ErrorModule,
  ErrorPageProps,
  HeadConfig,
  LayoutModule,
  PageDataResolver,
  PageProps,
  PageModule,
  RouteContext,
  RouteMiddlewareConfig,
  RouteMiddlewareRegistry,
  RouteMiddlewareResult,
  RouteParams,
  RouteSearchParams,
} from "./types";

type RouteEntry = {
  filePath: string;
  segments: string[];
  staticCount: number;
  catchAllCount: number;
};

type ResolveInput = {
  pathname: string;
  searchParams: RouteSearchParams;
  cookies?: Record<string, string>;
};

const FORCED_PACKAGE_REQUESTS = [
  "@webtypen/webframez-core",
  "@webtypen/webframez-react",
  "react",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom",
  "react-dom/client",
  "react-dom/server",
  "react-dom/server.node",
  "react-server-dom-webpack",
  "react-server-dom-webpack/server",
  "react-server-dom-webpack/client",
  "react-server-dom-webpack/client.node",
  "scheduler",
] as const;
let forcedPackageResolutionInstalled = false;

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

const MANAGED_HEAD_ATTR = "data-webframez-head";

function createManagedAttributes() {
  return `${MANAGED_HEAD_ATTR}="true"`;
}

function shouldForcePackageResolution(request: string) {
  return FORCED_PACKAGE_REQUESTS.some(
    (candidate) => request === candidate || request.startsWith(`${candidate}/`),
  );
}

function installForcedPackageResolution() {
  if (forcedPackageResolutionInstalled) {
    return;
  }

  const moduleWithPrivateResolver = Module as typeof Module & {
    _resolveFilename: (
      request: string,
      parent: NodeModule | null | undefined,
      isMain: boolean,
      options?: Record<string, unknown>,
    ) => string;
    _nodeModulePaths: (from: string) => string[];
  };
  const originalResolveFilename = moduleWithPrivateResolver._resolveFilename;
  const rootParent = {
    id: "__webframez_react_runtime__",
    filename: path.join(process.cwd(), "__webframez_react_runtime__.js"),
    path: process.cwd(),
    paths: moduleWithPrivateResolver._nodeModulePaths(process.cwd()),
  } as NodeModule & { paths: string[] };

  moduleWithPrivateResolver._resolveFilename = function patchedResolveFilename(
    request,
    parent,
    isMain,
    options,
  ) {
    if (typeof request === "string" && shouldForcePackageResolution(request)) {
      try {
        return originalResolveFilename.call(this, request, rootParent, false, options);
      } catch {
        // Fall through to Node's default resolver.
      }
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
  forcedPackageResolutionInstalled = true;
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
  const catchAllCount = segments.filter(
    (segment) => segment.startsWith("[...") && segment.endsWith("]"),
  ).length;

  return {
    filePath,
    segments,
    staticCount,
    catchAllCount,
  };
}

function matchRoute(entry: RouteEntry, pathname: string): RouteParams | null {
  const targetSegments = splitSegments(pathname);
  const params: RouteParams = {};

  for (let index = 0; index < entry.segments.length; index += 1) {
    const routeSegment = entry.segments[index];
    const isCatchAll =
      routeSegment.startsWith("[...") && routeSegment.endsWith("]");

    if (isCatchAll) {
      const paramName = routeSegment.slice(4, -1);
      if (!paramName || index !== entry.segments.length - 1) {
        return null;
      }

      const restSegments = targetSegments.slice(index);
      if (restSegments.length === 0) {
        return null;
      }

      params[paramName] = restSegments.map((segment) => decodeURIComponent(segment));
      return params;
    }

    const targetSegment = targetSegments[index];
    if (typeof targetSegment !== "string") {
      return null;
    }

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

  if (entry.segments.length !== targetSegments.length) {
    return null;
  }

  return params;
}

function mergeHead(...configs: Array<HeadConfig | undefined>) {
  const merged: HeadConfig = {
    meta: [],
    links: [],
  };

  for (const candidate of configs) {
    const config = normalizeHeadConfig(candidate, merged.assetsBaseUrl);
    if (!config) {
      continue;
    }

    if (config.title) {
      merged.title = config.title;
    }
    if (config.description) {
      merged.description = config.description;
    }
    if (config.assetsBaseUrl) {
      merged.assetsBaseUrl = config.assetsBaseUrl;
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
  const normalizedHead = normalizeHeadConfig(head) ?? head;
  const tags: string[] = [];

  if (normalizedHead.description) {
    tags.push(
      `<meta ${createManagedAttributes()} name=\"description\" content=\"${escapeHtml(normalizedHead.description)}\" />`
    );
  }

  if (normalizedHead.favicon) {
    tags.push(
      `<link ${createManagedAttributes()} rel=\"icon\" href=\"${escapeHtml(normalizedHead.favicon)}\" />`
    );
  }

  for (const meta of normalizedHead.meta ?? []) {
    const attrs = Object.entries(meta)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}=\"${escapeHtml(String(value))}\"`)
      .join(" ");
    tags.push(`<meta ${createManagedAttributes()} ${attrs} />`);
  }

  for (const link of normalizedHead.links ?? []) {
    const attrs = Object.entries(link)
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `${key}=\"${escapeHtml(String(value))}\"`)
      .join(" ");
    tags.push(`<link ${createManagedAttributes()} ${attrs} />`);
  }

  return tags.join("\n");
}

function clearModuleCache(modulePath: string, rootDir: string, visited = new Set<string>()) {
  const resolvedPath = require.resolve(modulePath);
  if (visited.has(resolvedPath)) {
    return;
  }

  visited.add(resolvedPath);
  const cachedModule = require.cache[resolvedPath];
  if (!cachedModule) {
    return;
  }

  for (const child of cachedModule.children) {
    if (child.id.startsWith(rootDir)) {
      clearModuleCache(child.id, rootDir, visited);
    }
  }

  delete require.cache[resolvedPath];
}

function resolveModule<T>(modulePath: string, rootDir: string): T {
  clearModuleCache(modulePath, rootDir);
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

async function resolvePageData<TData>(
  candidate: { Data?: PageDataResolver<TData> },
  context: RouteContext
) {
  if (!candidate.Data) {
    return undefined;
  }

  return candidate.Data(context);
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
    if (a.entry.catchAllCount !== b.entry.catchAllCount) {
      return a.entry.catchAllCount - b.entry.catchAllCount;
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
  installForcedPackageResolution();

  const pagesDir = options.pagesDir;
  const layoutPath = path.join(pagesDir, "layout.js");
  const errorPath = path.join(pagesDir, "errors.js");
  const middlewaresPath = path.join(pagesDir, "middlewares.js");

  function buildRouteEntries() {
    const files = walkFiles(pagesDir);
    return files
      .map((filePath) => toRouteEntry(pagesDir, filePath))
      .filter((entry): entry is RouteEntry => entry !== null)
      .sort((a, b) => {
        if (b.staticCount !== a.staticCount) {
          return b.staticCount - a.staticCount;
        }
        if (a.catchAllCount !== b.catchAllCount) {
          return a.catchAllCount - b.catchAllCount;
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
      ? resolveModule<LayoutModule>(layoutPath, pagesDir)
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

    const errorModule = resolveModule<ErrorModule>(errorPath, pagesDir);
    const errorNode = await errorModule.default(errorProps);

    const layoutHead = layoutModule
      ? await resolveHead(layoutModule, context)
      : undefined;
    const errorHead = await resolveHead(errorModule, errorProps);

    const layoutNode = layoutModule
      ? await layoutModule.default(context)
      : null;
    const model = layoutNode
      ? injectRouteChildren(layoutNode, errorNode)
      : errorNode;

    return {
      statusCode,
      model,
      head: mergeHead(layoutHead, errorHead),
    };
  }

  function normalizeMiddlewareNames(config?: RouteMiddlewareConfig) {
    if (!config) {
      return [];
    }

    return Array.isArray(config) ? config : [config];
  }

  function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object") {
      return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function mergeRouteData(currentData: unknown, nextData: RouteMiddlewareResult | unknown) {
    if (typeof nextData === "undefined") {
      return currentData;
    }

    if (isPlainObject(currentData) && isPlainObject(nextData)) {
      return {
        ...currentData,
        ...nextData,
      };
    }

    return nextData;
  }

  async function resolveMiddlewares(
    config: RouteMiddlewareConfig | undefined,
    context: RouteContext,
  ) {
    const middlewareNames = normalizeMiddlewareNames(config);
    const requiresNamedMiddleware = middlewareNames.length > 0;

    if (!fs.existsSync(middlewaresPath)) {
      if (!requiresNamedMiddleware) {
        return context;
      }

      throw createAbort({
        status: 500,
        message: `Invalid middleware '${middlewareNames[0]}'`,
      });
    }

    const middlewareModule = resolveModule<{ middlewares?: RouteMiddlewareRegistry }>(
      middlewaresPath,
      pagesDir,
    );
    const registry = middlewareModule.middlewares;
    if (!registry) {
      if (!requiresNamedMiddleware) {
        return context;
      }

      throw createAbort({
        status: 500,
        message: `Invalid middleware '${middlewareNames[0]}'`,
      });
    }

    const orderedMiddlewareNames =
      typeof registry["*"] === "function"
        ? ["*", ...middlewareNames]
        : middlewareNames;

    if (orderedMiddlewareNames.length === 0) {
      return context;
    }

    let nextContext: RouteContext = context;
    for (const middlewareName of orderedMiddlewareNames) {
      const middleware = registry[middlewareName];
      if (typeof middleware !== "function") {
        throw createAbort({
          status: 500,
          message: `Invalid middleware '${middlewareName}'`,
        });
      }

      const middlewareData = await middleware(nextContext);
      nextContext = {
        ...nextContext,
        data: mergeRouteData(nextContext.data, middlewareData),
      };
    }

    return nextContext;
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

      const pageModule = resolveModule<PageModule>(match.entry.filePath, pagesDir);
      const layoutModule = fs.existsSync(layoutPath)
        ? resolveModule<LayoutModule>(layoutPath, pagesDir)
        : null;
      const middlewareContext = await resolveMiddlewares(pageModule.middlewares, context);
      activeContext = middlewareContext;

      const pageData = await resolvePageData(pageModule, middlewareContext);
      const pageContext: PageProps = {
        ...middlewareContext,
        data: mergeRouteData(middlewareContext.data, pageData),
      };
      activeContext = pageContext;

      const pageNode = await pageModule.default(pageContext);
      const layoutHead = layoutModule
        ? await resolveHead(layoutModule, pageContext)
        : undefined;
      const pageHead = await resolveHead(pageModule, pageContext);

      const layoutNode = layoutModule
        ? await layoutModule.default(pageContext)
        : null;
      const model = layoutNode
        ? injectRouteChildren(layoutNode, pageNode)
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
