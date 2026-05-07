import React, { useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { createFromFetch, createFromReadableStream } from "react-server-dom-webpack/client";
import type { Root } from "react-dom/client";
import { RouteChildrenSlotProvider } from "@webtypen/webframez-react/route-slot";
import { normalizeHeadBasename, normalizeHeadConfig } from "./head";
import { injectRouteChildren } from "./router-runtime";
import type { ClientNavigationPayload, HeadConfig, HeadLinkTag, HeadMetaTag } from "./types";

type ClientOptions = {
  rootId?: string;
  rscEndpoint?: string;
};

export type RouterClient = {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
  refreshContext: () => void;
};

const noopRouter: RouterClient = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
  refreshContext: () => {},
};

export type CookieOptions = {
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  maxAge?: number;
  expires?: Date;
};

export type CookieClient = {
  all: () => Record<string, string>;
  get: (name: string) => string | undefined;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: Omit<CookieOptions, "maxAge" | "expires">) => void;
};

const RouterContext: React.Context<RouterClient | null> | null =
  typeof (React as unknown as { createContext?: unknown }).createContext === "function"
    ? React.createContext<RouterClient | null>(null)
    : null;
const GLOBAL_ROUTER_KEY = "__WEBFRAMEZ_ROUTER__";
const MANAGED_HEAD_SELECTOR = "[data-webframez-head='true']";

function scrollToTop() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const scroll = () => {
    window.scrollTo({ top: 0, left: 0 });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0;
    }
    document.documentElement.scrollTop = 0;
    if (document.body) {
      document.body.scrollTop = 0;
    }
  };

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(scroll);
    return;
  }

  window.setTimeout(scroll, 0);
}

function normalizeClientBasePath(value?: string) {
  return normalizeHeadBasename(value) ?? "";
}

function stripPathPrefix(pathname: string, prefix: string) {
  if (!prefix) {
    return pathname || "/";
  }

  if (pathname === prefix) {
    return "/";
  }

  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length) || "/";
  }

  return pathname || "/";
}

function joinBaseAndPath(basePath: string, pathname: string) {
  const normalizedPath =
    !pathname || pathname === "/"
      ? "/"
      : pathname.startsWith("/")
        ? pathname
        : `/${pathname}`;

  if (!basePath) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? basePath : `${basePath}${normalizedPath}`;
}

function getGlobalRouteBasePath() {
  if (typeof window === "undefined") {
    return normalizeClientBasePath(
      (globalThis as { __RSC_ROUTE_BASE_PATH?: string }).__RSC_ROUTE_BASE_PATH,
    );
  }

  return normalizeClientBasePath(
    (window as Window & { __RSC_ROUTE_BASE_PATH?: string }).__RSC_ROUTE_BASE_PATH,
  );
}

function resolveRouteRequestPath(pathname: string) {
  if (typeof window === "undefined") {
    return pathname || "/";
  }

  const visibleBasename = normalizeClientBasePath(
    (window as Window & { __RSC_BASENAME?: string }).__RSC_BASENAME,
  );
  const routeBasePath = getGlobalRouteBasePath();
  const relativePath = stripPathPrefix(pathname || "/", visibleBasename);

  return joinBaseAndPath(routeBasePath, relativePath);
}

function resolveRscEndpoint(defaultEndpoint: string) {
  if (typeof window === "undefined") {
    return defaultEndpoint;
  }

  const runtimeEndpoint = (window as Window & { __RSC_ENDPOINT?: string }).__RSC_ENDPOINT;
  return typeof runtimeEndpoint === "string" && runtimeEndpoint.trim() !== ""
    ? runtimeEndpoint
    : defaultEndpoint;
}

function readGlobalRouter() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = (window as Window & { __WEBFRAMEZ_ROUTER__?: RouterClient })[GLOBAL_ROUTER_KEY];
  return value ?? null;
}

function writeGlobalRouter(router: RouterClient) {
  if (typeof window === "undefined") {
    return;
  }

  (window as Window & { __WEBFRAMEZ_ROUTER__?: RouterClient })[GLOBAL_ROUTER_KEY] = router;
}

function parseBrowserCookies() {
  const result: Record<string, string> = {};
  const raw = typeof document === "undefined" ? "" : document.cookie;
  if (!raw || raw.trim() === "") {
    return result;
  }

  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    const name = eqIndex >= 0 ? trimmed.slice(0, eqIndex).trim() : trimmed;
    const value = eqIndex >= 0 ? trimmed.slice(eqIndex + 1) : "";
    if (!name) {
      continue;
    }
    result[name] = decodeURIComponent(value);
  }

  return result;
}

function buildCookieString(name: string, value: string, options: CookieOptions = {}) {
  const cookieParts = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) {
    cookieParts.push(`Path=${options.path}`);
  }
  if (options.domain) {
    cookieParts.push(`Domain=${options.domain}`);
  }
  if (typeof options.maxAge === "number") {
    cookieParts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    cookieParts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.sameSite) {
    cookieParts.push(`SameSite=${options.sameSite}`);
  }
  if (options.secure) {
    cookieParts.push("Secure");
  }

  return cookieParts.join("; ");
}

export function useCookie(): CookieClient {
  return React.useMemo(
    () => ({
      all: () => parseBrowserCookies(),
      get: (name) => parseBrowserCookies()[name],
      set: (name, value, options) => {
        if (typeof document === "undefined") {
          return;
        }
        document.cookie = buildCookieString(name, value, options);
      },
      remove: (name, options) => {
        if (typeof document === "undefined") {
          return;
        }
        document.cookie = buildCookieString(name, "", {
          ...(options ?? {}),
          maxAge: 0,
        });
      },
    }),
    []
  );
}

export function useRouter(): RouterClient {
  const value = RouterContext ? React.useContext(RouterContext) : null;
  if (!value) {
    const globalRouter = readGlobalRouter();
    if (globalRouter) {
      return globalRouter;
    }
    if (typeof window === "undefined") {
      return noopRouter;
    }
    throw new Error("useRouter must be used inside mountWebframezClient()");
  }
  return value;
}

function LoaderBar({ active }: { active: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 3,
        zIndex: 9999,
        transformOrigin: "left",
        transform: active ? "scaleX(1)" : "scaleX(0)",
        transition: "transform 180ms ease",
        background: "linear-gradient(90deg, #0ea5e9, #22c55e)",
      }}
    />
  );
}

function appendManagedMetaTag(meta: HeadMetaTag) {
  const element = document.createElement("meta");
  element.setAttribute("data-webframez-head", "true");

  const entries = Object.entries(meta).filter(([, value]) => Boolean(value));
  for (const [key, value] of entries) {
    element.setAttribute(key, String(value));
  }

  document.head.appendChild(element);
}

function appendManagedLinkTag(link: HeadLinkTag) {
  const element = document.createElement("link");
  element.setAttribute("data-webframez-head", "true");

  const entries = Object.entries(link).filter(([, value]) => Boolean(value));
  for (const [key, value] of entries) {
    element.setAttribute(key, String(value));
  }

  document.head.appendChild(element);
}

function applyHead(head: HeadConfig) {
  if (typeof document === "undefined") {
    return;
  }

  const normalizedHead = normalizeHeadConfig(head) ?? head;
  applyHeadRuntimeGlobals(normalizedHead);

  document.title = normalizedHead.title || "Webframez React";

  for (const managedNode of document.head.querySelectorAll(MANAGED_HEAD_SELECTOR)) {
    managedNode.remove();
  }

  if (normalizedHead.description) {
    appendManagedMetaTag({
      name: "description",
      content: normalizedHead.description,
    });
  }

  if (normalizedHead.favicon) {
    appendManagedLinkTag({
      rel: "icon",
      href: normalizedHead.favicon,
    });
  }

  for (const meta of normalizedHead.meta ?? []) {
    appendManagedMetaTag(meta);
  }

  for (const link of normalizedHead.links ?? []) {
    appendManagedLinkTag(link);
  }
}

function applyHeadRuntimeGlobals(head: HeadConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedHead = normalizeHeadConfig(head) ?? head;
  const normalizedBasename = normalizeHeadBasename(normalizedHead.basename);
  const normalizedRouteBasePath = normalizeHeadBasename(
    normalizedHead.routeBasePath,
  );
  const normalizedTransportBasePath = normalizeHeadBasename(
    normalizedHead.transportBasePath,
  );
  (window as Window & { __RSC_BASENAME?: string }).__RSC_BASENAME = normalizedBasename ?? "";
  (window as Window & { __RSC_ROUTE_BASE_PATH?: string }).__RSC_ROUTE_BASE_PATH =
    normalizedRouteBasePath ?? "";
  if (normalizedTransportBasePath !== undefined) {
    (window as Window & { __RSC_ENDPOINT?: string }).__RSC_ENDPOINT =
      joinBaseAndPath(normalizedTransportBasePath, "/rsc");
  }
}

function createReadableStreamFromString(value: string) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(value));
      controller.close();
    },
  });
}

function readInitialPayload(): Promise<ClientNavigationPayload> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = (window as Window & { __RSC_INITIAL_PAYLOAD?: unknown }).__RSC_INITIAL_PAYLOAD;
  if (typeof value !== "string" || value === "") {
    return null;
  }

  delete (window as Window & { __RSC_INITIAL_PAYLOAD?: unknown }).__RSC_INITIAL_PAYLOAD;
  return createFromReadableStream(
    createReadableStreamFromString(value)
  ) as Promise<ClientNavigationPayload>;
}

function createInitialResponse(rscEndpoint: string) {
  const endpoint = resolveRscEndpoint(rscEndpoint);
  const requestPath = resolveRouteRequestPath(window.location.pathname);

  return (
    readInitialPayload() ??
    (createFromFetch(
      fetch(
        `${endpoint}?path=${encodeURIComponent(requestPath)}&search=${encodeURIComponent(window.location.search)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Accept: "text/x-component",
          },
        }
      )
    ) as Promise<ClientNavigationPayload>)
  );
}

function createApp(initialResponse: Promise<ClientNavigationPayload>, rscEndpoint: string) {
  return function App() {
    const initialPayload = React.use(initialResponse);
    const hasInitialSplitTree =
      typeof initialPayload.contextModel !== "undefined" &&
      typeof initialPayload.pageModel !== "undefined";
    const [tree, setTree] = useState<React.ReactNode>(initialPayload.model);
    const [contextTree, setContextTree] = useState<React.ReactNode | undefined>(
      initialPayload.contextModel,
    );
    const [pageTree, setPageTree] = useState<React.ReactNode | undefined>(
      initialPayload.pageModel,
    );
    const [head, setHead] = useState<HeadConfig>(initialPayload.head);
    const [pending, setPending] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [renderSplitTree, setRenderSplitTree] = useState(hasInitialSplitTree);

    async function fetchRoutePayload(url: URL) {
      const endpoint = resolveRscEndpoint(rscEndpoint);
      const requestPath = resolveRouteRequestPath(url.pathname);
      const response = createFromFetch(
        fetch(
          `${endpoint}?path=${encodeURIComponent(requestPath)}&search=${encodeURIComponent(url.search)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
            headers: {
              Accept: "text/x-component",
            },
          }
        )
      );

      return await (response as Promise<ClientNavigationPayload>);
    }

    async function navigate(url: URL, mode: "push" | "replace" | "none" = "push") {
      setPending(true);

      try {
        const nextPayload = await fetchRoutePayload(url);
        applyHead(nextPayload.head);
        setHead(nextPayload.head);
        setTree(nextPayload.model);
        setContextTree(nextPayload.contextModel);
        setPageTree(nextPayload.pageModel);
        setRenderSplitTree(true);

        const nextHref = `${url.pathname}${url.search}`;
        if (mode === "replace") {
          history.replaceState(null, "", nextHref);
          scrollToTop();
        } else if (mode === "push") {
          history.pushState(null, "", nextHref);
          scrollToTop();
        }
      } catch (error) {
        console.error("[webframez-react] Failed to render route", error);
        setTree(<p>Failed to load route.</p>);
      } finally {
        setPending(false);
      }
    }

    async function refreshContext() {
      setPending(true);

      try {
        const nextPayload = await fetchRoutePayload(new URL(window.location.href));
        applyHead(nextPayload.head);
        setHead(nextPayload.head);

        if (Object.prototype.hasOwnProperty.call(nextPayload, "contextModel")) {
          setContextTree(nextPayload.contextModel);
          setRenderSplitTree(true);
          return;
        }

        setTree(nextPayload.model);
        setRenderSplitTree(false);
      } catch (error) {
        console.error("[webframez-react] Failed to refresh route context", error);
      } finally {
        setPending(false);
      }
    }

    useEffect(() => {
      applyHead(head);
    }, [head]);

    useEffect(() => {
      setMounted(true);

      const onPopState = () => {
        void navigate(new URL(window.location.href), "none");
      };

      window.addEventListener("popstate", onPopState);

      return () => {
        window.removeEventListener("popstate", onPopState);
      };
    }, []);

    const routerValue = React.useMemo<RouterClient>(
      () => ({
        push: (href: string) => {
          void navigate(new URL(href, window.location.origin), "push");
        },
        replace: (href: string) => {
          void navigate(new URL(href, window.location.origin), "replace");
        },
        refresh: () => {
          void navigate(new URL(window.location.href), "none");
        },
        refreshContext: () => {
          void refreshContext();
        },
      }),
      []
    );
    writeGlobalRouter(routerValue);

    const renderedTree =
      renderSplitTree && typeof pageTree !== "undefined"
        ? contextTree
          ? (
              <RouteChildrenSlotProvider page={pageTree}>
                {injectRouteChildren(contextTree, pageTree)}
              </RouteChildrenSlotProvider>
            )
          : pageTree
        : tree;

    const content = (
      <>
        {mounted ? <LoaderBar active={pending} /> : null}
        {renderedTree ?? <p style={{ padding: 24 }}>Loading...</p>}
      </>
    );

    if (!RouterContext) {
      return content;
    }

    return (
      <RouterContext.Provider value={routerValue}>
        {content}
      </RouterContext.Provider>
    );
  };
}

export function mountWebframezClient(options: ClientOptions = {}) {
  const rootId = options.rootId ?? "root";
  const rootEl = document.getElementById(rootId);
  if (!rootEl) {
    throw new Error(`Missing #${rootId} element`);
  }

  const endpointFromGlobal =
    typeof window !== "undefined" && (window as Window & { __RSC_ENDPOINT?: string }).__RSC_ENDPOINT;
  const rscEndpoint = options.rscEndpoint ?? endpointFromGlobal ?? "/rsc";

  const initialResponse = Promise.resolve(createInitialResponse(rscEndpoint)).then((payload) => {
    if (payload?.head) {
      applyHeadRuntimeGlobals(payload.head);
    }

    return payload;
  });
  const App = createApp(initialResponse, rscEndpoint);
  const root = hydrateRoot(rootEl, <App />);

  return root;
}
