import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createFromFetch } from "react-server-dom-webpack/client";
import type { Root } from "react-dom/client";

type ClientOptions = {
  rootId?: string;
  rscEndpoint?: string;
};

export type RouterClient = {
  push: (href: string) => void;
  replace: (href: string) => void;
  refresh: () => void;
};

const noopRouter: RouterClient = {
  push: () => {},
  replace: () => {},
  refresh: () => {},
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

function createApp(rscEndpoint: string) {
  return function App() {
    const [tree, setTree] = useState<React.ReactNode>(null);
    const [pending, setPending] = useState(false);

    async function navigate(url: URL, mode: "push" | "replace" | "none" = "push") {
      setPending(true);

      try {
        const response = createFromFetch(
          fetch(
            `${rscEndpoint}?path=${encodeURIComponent(url.pathname)}&search=${encodeURIComponent(url.search)}`,
            {
              headers: {
                Accept: "text/x-component",
              },
            }
          )
        );

        const nextTree = await (response as Promise<React.ReactNode>);
        setTree(nextTree);

        const nextHref = `${url.pathname}${url.search}`;
        if (mode === "replace") {
          history.replaceState(null, "", nextHref);
        } else if (mode === "push") {
          history.pushState(null, "", nextHref);
        }
      } catch (error) {
        console.error("[webframez-react] Failed to render route", error);
        setTree(<p>Failed to load route.</p>);
      } finally {
        setPending(false);
      }
    }

    useEffect(() => {
      const onPopState = () => {
        navigate(new URL(window.location.href), "none");
      };

      window.addEventListener("popstate", onPopState);

      navigate(new URL(window.location.href), "none");

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
      }),
      []
    );
    writeGlobalRouter(routerValue);

    if (!RouterContext) {
      return (
        <>
          <LoaderBar active={pending} />
          {tree ?? <p style={{ padding: 24 }}>Loading...</p>}
        </>
      );
    }

    return (
      <RouterContext.Provider value={routerValue}>
        <LoaderBar active={pending} />
        {tree ?? <p style={{ padding: 24 }}>Loading...</p>}
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

  const App = createApp(rscEndpoint);
  const root = createRoot(rootEl);
  root.render(<App />);

  return root;
}
