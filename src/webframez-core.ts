import type { CreateNodeHandlerOptions } from "./http"; // @ts-ignore
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { createNodeRequestHandler } from "./http";

type CoreRequest = {
  message?: IncomingMessage | null;
  env?: unknown;
  website?: unknown;
  __webframezReactContext?: unknown;
};

type CoreResponse = {
  res?: ServerResponse | null;
};

function normalizeMountPath(path: string) {
  const trimmed = (path || "").trim();
  let normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  if (normalized.endsWith("/**")) {
    normalized = normalized.slice(0, -3);
  } else if (normalized.endsWith("/*")) {
    normalized = normalized.slice(0, -2);
  }

  while (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized || "/";
}

const REGISTRY_KEY = "__WEBFRAMEZ_REACT_BUILD_TARGETS__";

export type WebframezReactBuildTarget = {
  path: string;
  routePath: string;
  routeKey: string;
  srcPath: string;
  distRootDir: string;
  pagesDir: string;
  manifestPath: string;
  assetsPrefix?: string;
  rscPath?: string;
  clientScriptUrl?: string;
  clientEntryPath?: string;
  styleSrcPath?: string;
};

function getBuildTargetsRegistry(): WebframezReactBuildTarget[] {
  const globalWithRegistry = globalThis as typeof globalThis & {
    [REGISTRY_KEY]?: WebframezReactBuildTarget[];
  };

  if (!globalWithRegistry[REGISTRY_KEY]) {
    globalWithRegistry[REGISTRY_KEY] = [];
  }

  return globalWithRegistry[REGISTRY_KEY];
}

function toRouteKey(mountPath: string) {
  const trimmed = mountPath.replace(/^\/+|\/+$/g, "");
  return trimmed || "root";
}

function toPascalCase(value: string) {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

function getOutputRoot() {
  const configured = process.env.WEBFRAMEZ_REACT_OUT_DIR;
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  const isTsNodeRuntime =
    process.execArgv.some((arg) => arg.includes("ts-node/register")) ||
    process.env.TS_NODE_FILES === "true" ||
    (typeof require !== "undefined" && typeof require.extensions[".ts"] === "function");

  if (isTsNodeRuntime && path.basename(process.cwd()) !== "build") {
    return path.resolve(process.cwd(), "build");
  }

  return process.cwd();
}

function resolveFromProjectRoot(value: string) {
  return path.resolve(process.cwd(), value);
}

function resolveFromOutputRoot(value: string) {
  return path.resolve(getOutputRoot(), value);
}

function buildRenderDefaults(routePathValue: string) {
  const mountPath = normalizeMountPath(routePathValue);
  const routeKey = toRouteKey(mountPath);
  const routeDirName = toPascalCase(routeKey) || routeKey;
  const routePath = mountPath === "/" ? "/*" : `${mountPath}/*`;
  const srcPath = path.join("app", routeDirName, "react");
  const pagesDir = srcPath;
  const distRootDir = path.join("webframez-react", routeKey);
  const styleSrcPath = path.join("app", routeDirName, "assets", "scss");

  if (mountPath === "/") {
    return {
      path: mountPath,
      routePath,
      routeKey,
      srcPath: resolveFromProjectRoot(srcPath),
      distRootDir: resolveFromOutputRoot(distRootDir),
      pagesDir: resolveFromOutputRoot(pagesDir),
      manifestPath: resolveFromOutputRoot(path.join(distRootDir, "react-client-manifest.json")),
      styleSrcPath: resolveFromProjectRoot(styleSrcPath),
      basePath: undefined,
      assetsPrefix: undefined,
      rscPath: undefined,
      clientScriptUrl: undefined,
    };
  }

  return {
    path: mountPath,
    routePath,
    routeKey,
    srcPath: resolveFromProjectRoot(srcPath),
    distRootDir: resolveFromOutputRoot(distRootDir),
    pagesDir: resolveFromOutputRoot(pagesDir),
    manifestPath: resolveFromOutputRoot(path.join(distRootDir, "react-client-manifest.json")),
    styleSrcPath: resolveFromProjectRoot(styleSrcPath),
    basePath: mountPath,
    assetsPrefix: `${mountPath}/assets/`,
    rscPath: `${mountPath}/rsc`,
    clientScriptUrl: `${mountPath}/assets/client.js`,
  };
}

async function waitForResponseFinish(res: ServerResponse) {
  if (res.writableEnded || res.destroyed) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onFinish = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      resolve();
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      res.off("finish", onFinish);
      res.off("close", onClose);
      res.off("error", onError);
    };

    res.on("finish", onFinish);
    res.on("close", onClose);
    res.on("error", onError);
  });
}

type CoreRouteFacade = {
  extend: (
    name: string,
    factory: (route: CoreRouteFacade) => (...args: any[]) => any,
  ) => CoreRouteFacade;
  get: (path: string, component: any, options?: Record<string, any>) => void;
  post: (path: string, component: any, options?: Record<string, any>) => void;
  put: (path: string, component: any, options?: Record<string, any>) => void;
  delete: (path: string, component: any, options?: Record<string, any>) => void;
  renderReact?: (
    path: string,
    options?: WebframezCoreReactRenderRouteOptions,
  ) => void;
  reactRender?: (
    path: string,
    options?: WebframezCoreReactRenderRouteOptions,
  ) => void;
};

export interface WebframezCoreRouteFacadeExtensions {
  renderReact(
    path: string,
    options?: WebframezCoreReactRenderRouteOptions,
  ): void;
  reactRender(
    path: string,
    options?: WebframezCoreReactRenderRouteOptions,
  ): void;
}

export type WebframezCoreRouteMethod = "GET" | "POST" | "PUT" | "DELETE";
export type WebframezCoreRouteMiddleware = string | string[];

export interface WebframezCoreRouteRegistrationOptions {
  middleware?: WebframezCoreRouteMiddleware;
  domains?: string | string[];
  [key: string]: unknown;
}

export interface WebframezCoreReactRenderRouteOptions
  extends Partial<CreateNodeHandlerOptions> {
  srcPath?: string;
  clientEntryPath?: string;
  styleSrcPath?: string;
  method?: WebframezCoreRouteMethod | WebframezCoreRouteMethod[];
  routeOptions?: WebframezCoreRouteRegistrationOptions;
}

function normalizeMethods(
  method: WebframezCoreRouteMethod | WebframezCoreRouteMethod[] | undefined,
): WebframezCoreRouteMethod[] {
  if (!method) {
    return ["GET"];
  }

  return Array.isArray(method) ? method : [method];
}

function registerByMethod(
  route: CoreRouteFacade,
  method: WebframezCoreRouteMethod,
  path: string,
  component: any,
  routeOptions?: WebframezCoreRouteRegistrationOptions,
) {
  if (method === "GET") {
    route.get(path, component, routeOptions);
    return;
  }

  if (method === "POST") {
    route.post(path, component, routeOptions);
    return;
  }

  if (method === "PUT") {
    route.put(path, component, routeOptions);
    return;
  }

  route.delete(path, component, routeOptions);
}

function registerRouteRenderer(
  route: CoreRouteFacade,
  methodName: "renderReact" | "reactRender",
) {
  route.extend(methodName, () => {
    return (routePathValue: string, options: WebframezCoreReactRenderRouteOptions = {}) => {
      const defaults = buildRenderDefaults(routePathValue);
      const {
        method,
        routeOptions,
        srcPath,
        distRootDir,
        pagesDir,
        manifestPath,
        basePath,
        assetsPrefix,
        rscPath,
        clientScriptUrl,
        clientEntryPath,
        styleSrcPath,
        ...nodeHandlerOptions
      } = options;
      const resolvedDistRootDir = distRootDir ?? defaults.distRootDir;
      const resolvedPagesDir = pagesDir ?? defaults.pagesDir;
      const resolvedManifestPath = manifestPath ?? path.join(resolvedDistRootDir, "react-client-manifest.json");
      const resolvedTarget: WebframezReactBuildTarget = {
        path: defaults.path,
        routePath: defaults.routePath,
        routeKey: defaults.routeKey,
        srcPath: srcPath ? resolveFromProjectRoot(srcPath) : defaults.srcPath,
        distRootDir: resolvedDistRootDir,
        pagesDir: resolvedPagesDir,
        manifestPath: resolvedManifestPath,
        assetsPrefix: assetsPrefix ?? defaults.assetsPrefix,
        rscPath: rscPath ?? defaults.rscPath,
        clientScriptUrl: clientScriptUrl ?? defaults.clientScriptUrl,
        clientEntryPath: clientEntryPath ? resolveFromProjectRoot(clientEntryPath) : undefined,
        styleSrcPath: styleSrcPath ? resolveFromProjectRoot(styleSrcPath) : defaults.styleSrcPath,
      };
      getBuildTargetsRegistry().push(resolvedTarget);

      if (process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES === "1") {
        return;
      }

      const handleNodeRequest = createNodeRequestHandler({
        ...nodeHandlerOptions,
        distRootDir: resolvedTarget.distRootDir,
        pagesDir: resolvedTarget.pagesDir,
        manifestPath: resolvedTarget.manifestPath,
        basePath: basePath ?? defaults.basePath,
        assetsPrefix: assetsPrefix ?? defaults.assetsPrefix,
        rscPath: rscPath ?? defaults.rscPath,
        clientScriptUrl: clientScriptUrl ?? defaults.clientScriptUrl,
      });

      const methods = normalizeMethods(method);
      for (const currentMethod of methods) {
        registerByMethod(
          route,
          currentMethod,
          defaults.routePath,
          async (req: CoreRequest, res: CoreResponse) => {
            if (!req.message || !res.res) {
              throw new Error(
                `Route.${methodName} only supports node/http requests`,
              );
            }

            const message = req.message as IncomingMessage & {
              __webframezCoreRequest?: CoreRequest;
            };
            message.__webframezCoreRequest = req;
            try {
              await handleNodeRequest(message, res.res);
            } finally {
              delete message.__webframezCoreRequest;
            }
            await waitForResponseFinish(res.res);
          },
          routeOptions,
        );
      }
    };
  });
}

export function resolveWebframezReactRouteOptions(
  routePathValue: string,
  options: WebframezCoreReactRenderRouteOptions = {},
): CreateNodeHandlerOptions & WebframezReactBuildTarget {
  const defaults = buildRenderDefaults(routePathValue);
  const distRootDir = options.distRootDir ?? defaults.distRootDir;
  const pagesDir = options.pagesDir ?? defaults.pagesDir;
  const manifestPath = options.manifestPath ?? path.join(distRootDir, "react-client-manifest.json");

  return {
    path: defaults.path,
    routePath: defaults.routePath,
    routeKey: defaults.routeKey,
    srcPath: options.srcPath ? resolveFromProjectRoot(options.srcPath) : defaults.srcPath,
    distRootDir,
    pagesDir,
    manifestPath,
    assetsPrefix: options.assetsPrefix ?? defaults.assetsPrefix,
    rscPath: options.rscPath ?? defaults.rscPath,
    clientScriptUrl: options.clientScriptUrl ?? defaults.clientScriptUrl,
    clientEntryPath: options.clientEntryPath
      ? resolveFromProjectRoot(options.clientEntryPath)
      : undefined,
    styleSrcPath: options.styleSrcPath
      ? resolveFromProjectRoot(options.styleSrcPath)
      : defaults.styleSrcPath,
    basePath: options.basePath ?? defaults.basePath,
    liveReloadPath: options.liveReloadPath,
  };
}

export function getRegisteredReactBuildTargets() {
  return [...getBuildTargetsRegistry()];
}

export function clearRegisteredReactBuildTargets() {
  getBuildTargetsRegistry().length = 0;
}

export function initWebframezReact<T extends CoreRouteFacade>(
  route: T,
): T & WebframezCoreRouteFacadeExtensions {
  if (!route || typeof route.extend !== "function") {
    throw new Error(
      "initWebframezReact requires a webframez-core Route facade",
    );
  }

  if (typeof route.renderReact !== "function") {
    registerRouteRenderer(route, "renderReact");
  }

  // Backward compatibility alias.
  if (typeof route.reactRender !== "function") {
    registerRouteRenderer(route, "reactRender");
  }

  return route as T & WebframezCoreRouteFacadeExtensions;
}

export const setupWebframezCoreReactRoute = initWebframezReact;
