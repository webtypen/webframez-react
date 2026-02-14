var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.tsx
var client_exports = {};
__export(client_exports, {
  mountWebframezClient: () => mountWebframezClient,
  useCookie: () => useCookie,
  useRouter: () => useRouter
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require("react"), 1);
var import_client = require("react-dom/client");
var import_client2 = require("react-server-dom-webpack/client");
var import_jsx_runtime = require("react/jsx-runtime");
var noopRouter = {
  push: () => {
  },
  replace: () => {
  },
  refresh: () => {
  }
};
var RouterContext = typeof import_react.default.createContext === "function" ? import_react.default.createContext(null) : null;
var GLOBAL_ROUTER_KEY = "__WEBFRAMEZ_ROUTER__";
function readGlobalRouter() {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window[GLOBAL_ROUTER_KEY];
  return value ?? null;
}
function writeGlobalRouter(router) {
  if (typeof window === "undefined") {
    return;
  }
  window[GLOBAL_ROUTER_KEY] = router;
}
function parseBrowserCookies() {
  const result = {};
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
function buildCookieString(name, value, options = {}) {
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
function useCookie() {
  return import_react.default.useMemo(
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
          ...options ?? {},
          maxAge: 0
        });
      }
    }),
    []
  );
}
function useRouter() {
  const value = RouterContext ? import_react.default.useContext(RouterContext) : null;
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
function LoaderBar({ active }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      style: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: 3,
        zIndex: 9999,
        transformOrigin: "left",
        transform: active ? "scaleX(1)" : "scaleX(0)",
        transition: "transform 180ms ease",
        background: "linear-gradient(90deg, #0ea5e9, #22c55e)"
      }
    }
  );
}
function createApp(rscEndpoint) {
  return function App() {
    const [tree, setTree] = (0, import_react.useState)(null);
    const [pending, setPending] = (0, import_react.useState)(false);
    async function navigate(url, mode = "push") {
      setPending(true);
      try {
        const response = (0, import_client2.createFromFetch)(
          fetch(
            `${rscEndpoint}?path=${encodeURIComponent(url.pathname)}&search=${encodeURIComponent(url.search)}`,
            {
              headers: {
                Accept: "text/x-component"
              }
            }
          )
        );
        const nextTree = await response;
        setTree(nextTree);
        const nextHref = `${url.pathname}${url.search}`;
        if (mode === "replace") {
          history.replaceState(null, "", nextHref);
        } else if (mode === "push") {
          history.pushState(null, "", nextHref);
        }
      } catch (error) {
        console.error("[webframez-react] Failed to render route", error);
        setTree(/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Failed to load route." }));
      } finally {
        setPending(false);
      }
    }
    (0, import_react.useEffect)(() => {
      const onPopState = () => {
        navigate(new URL(window.location.href), "none");
      };
      window.addEventListener("popstate", onPopState);
      navigate(new URL(window.location.href), "none");
      return () => {
        window.removeEventListener("popstate", onPopState);
      };
    }, []);
    const routerValue = import_react.default.useMemo(
      () => ({
        push: (href) => {
          void navigate(new URL(href, window.location.origin), "push");
        },
        replace: (href) => {
          void navigate(new URL(href, window.location.origin), "replace");
        },
        refresh: () => {
          void navigate(new URL(window.location.href), "none");
        }
      }),
      []
    );
    writeGlobalRouter(routerValue);
    if (!RouterContext) {
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderBar, { active: pending }),
        tree ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { padding: 24 }, children: "Loading..." })
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RouterContext.Provider, { value: routerValue, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderBar, { active: pending }),
      tree ?? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { padding: 24 }, children: "Loading..." })
    ] });
  };
}
function mountWebframezClient(options = {}) {
  const rootId = options.rootId ?? "root";
  const rootEl = document.getElementById(rootId);
  if (!rootEl) {
    throw new Error(`Missing #${rootId} element`);
  }
  const endpointFromGlobal = typeof window !== "undefined" && window.__RSC_ENDPOINT;
  const rscEndpoint = options.rscEndpoint ?? endpointFromGlobal ?? "/rsc";
  const App = createApp(rscEndpoint);
  const root = (0, import_client.createRoot)(rootEl);
  root.render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {}));
  return root;
}
//# sourceMappingURL=client.cjs.map
