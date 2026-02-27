import type { CreateNodeHandlerOptions } from "./http"; // @ts-ignore
import type { IncomingMessage, ServerResponse } from "node:http";
import { createNodeRequestHandler } from "./http";

type CoreRequest = {
  message?: IncomingMessage | null;
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

function buildRenderDefaults(path: string) {
  const mountPath = normalizeMountPath(path);
  const routePath = mountPath === "/" ? "/*" : `${mountPath}/*`;

  if (mountPath === "/") {
    return {
      routePath,
      basePath: undefined,
      assetsPrefix: undefined,
      rscPath: undefined,
      clientScriptUrl: undefined,
    };
  }

  return {
    routePath,
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
    options: WebframezCoreReactRenderRouteOptions,
  ) => void;
  reactRender?: (
    path: string,
    options: WebframezCoreReactRenderRouteOptions,
  ) => void;
};

export interface WebframezCoreRouteFacadeExtensions {
  renderReact(
    path: string,
    options: WebframezCoreReactRenderRouteOptions,
  ): void;
  reactRender(
    path: string,
    options: WebframezCoreReactRenderRouteOptions,
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
  extends CreateNodeHandlerOptions {
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
    return (path: string, options: WebframezCoreReactRenderRouteOptions) => {
      if (!options || !options.distRootDir) {
        throw new Error(
          `Route.${methodName} requires at least { distRootDir }`,
        );
      }

      const defaults = buildRenderDefaults(path);
      const {
        method,
        routeOptions,
        basePath,
        assetsPrefix,
        rscPath,
        clientScriptUrl,
        ...nodeHandlerOptions
      } = options;
      const handleNodeRequest = createNodeRequestHandler({
        ...nodeHandlerOptions,
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

            await handleNodeRequest(req.message, res.res);
            await waitForResponseFinish(res.res);
          },
          routeOptions,
        );
      }
    };
  });
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
