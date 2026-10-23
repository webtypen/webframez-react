"use client";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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

// node_modules/@webtypen/webframez-core/dist/routing.js
var require_routing = __commonJS({
  "node_modules/@webtypen/webframez-core/dist/routing.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.appRelativePath = exports2.appPath = exports2.getBasename = exports2.normalizeBasename = void 0;
    function normalizeBasename2(value) {
      if (value == null || value === "" || value === "/")
        return "";
      if (typeof value !== "string")
        throw new Error("Router basename must be a string.");
      const base = value.trim().replace(/\/+$/, "");
      if (!base && value.trim().length <= 1)
        return "";
      if (!/^\/(?:[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*)(?:\/[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*)*$/.test(base)) {
        throw new Error("Router basename must be empty or an absolute path such as /my-app.");
      }
      return base;
    }
    exports2.normalizeBasename = normalizeBasename2;
    function getBasename2() {
      var _a, _b, _c, _d;
      const runtime = globalThis;
      return (_d = (_c = (_b = (_a = runtime.__WEBFRAMEZ_ROUTING_CONTEXT__) === null || _a === void 0 ? void 0 : _a.getStore()) !== null && _b !== void 0 ? _b : runtime.__RSC_BASENAME) !== null && _c !== void 0 ? _c : runtime.__WEBFRAMEZ_ROUTER_BASENAME__) !== null && _d !== void 0 ? _d : "";
    }
    exports2.getBasename = getBasename2;
    function appPath2(value, basename = getBasename2()) {
      const base = normalizeBasename2(basename);
      if (!base || !value.startsWith("/") || value.startsWith("//") || hasBasename(value, base))
        return value;
      return base + value;
    }
    exports2.appPath = appPath2;
    function appRelativePath2(value, basename = getBasename2()) {
      const base = normalizeBasename2(basename);
      if (!base || !hasBasename(value, base))
        return value;
      const relative = value.slice(base.length);
      return !relative || relative.startsWith("?") || relative.startsWith("#") ? "/" + relative : relative;
    }
    exports2.appRelativePath = appRelativePath2;
    function hasBasename(value, base) {
      return value === base || value.startsWith(base + "/") || value.startsWith(base + "?") || value.startsWith(base + "#");
    }
  }
});

// node_modules/@webtypen/webframez-core/routing.js
var require_routing2 = __commonJS({
  "node_modules/@webtypen/webframez-core/routing.js"(exports2, module2) {
    module2.exports = require_routing();
  }
});

// src/navigation.tsx
var navigation_exports = {};
__export(navigation_exports, {
  Link: () => Link,
  Redirect: () => Redirect
});
module.exports = __toCommonJS(navigation_exports);
var import_react = __toESM(require("react"), 1);

// src/paths.ts
var import_routing = __toESM(require_routing2(), 1);

// src/navigation.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function getClientRouter() {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.__WEBFRAMEZ_ROUTER__;
  return value ?? null;
}
function withLeadingSlash(value) {
  return value.startsWith("/") ? value : `/${value}`;
}
function normalizeBase(base) {
  if (!base || base.trim() === "" || base === "/") {
    return "";
  }
  const withSlash = withLeadingSlash(base.trim());
  return withSlash.endsWith("/") ? withSlash.slice(0, -1) : withSlash;
}
function isExternal(href) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href) || href.startsWith("//");
}
function navigateWithClientRouter(href, mode = "push") {
  const router = getClientRouter();
  if (router) {
    router[mode](href);
    return;
  }
  window.setTimeout(() => {
    const nextRouter = getClientRouter();
    if (nextRouter) {
      nextRouter[mode](href);
      return;
    }
    if (mode === "replace") {
      window.location.replace(href);
    } else {
      window.location.assign(href);
    }
  }, 0);
}
function resolveHref(to, basename) {
  if (!to || to.trim() === "") {
    return "/";
  }
  const trimmed = to.trim();
  if (isExternal(trimmed) || trimmed.startsWith("#")) {
    return trimmed;
  }
  const [pathPart, hashPart] = trimmed.split("#", 2);
  const [pathnamePart, queryPart] = pathPart.split("?", 2);
  const pathname = withLeadingSlash(pathnamePart || "/");
  const base = normalizeBase(basename);
  let resolvedPath = pathname;
  if (base && pathname !== "/" && !pathname.startsWith(`${base}/`) && pathname !== base) {
    resolvedPath = `${base}${pathname}`;
  } else if (base && pathname === "/") {
    resolvedPath = base;
  }
  const query = queryPart ? `?${queryPart}` : "";
  const hash = hashPart ? `#${hashPart}` : "";
  return `${resolvedPath}${query}${hash}`;
}
var Link = import_react.default.forwardRef(function Link2({ to, basename, onClick, ...rest }, ref) {
  const resolvedHref = resolveHref(to, basename ?? (0, import_routing.getBasename)());
  const isServerRender = typeof window === "undefined";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "a",
    {
      ...rest,
      ref,
      href: resolvedHref,
      onClick: isServerRender ? void 0 : (event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (rest.download != null && rest.download !== false)
          return;
        if (rest.target && rest.target !== "_self") {
          return;
        }
        if (isExternal(resolvedHref)) {
          return;
        }
        event.preventDefault();
        navigateWithClientRouter(resolvedHref);
      }
    }
  );
});
function Redirect({ to, basename, replace = true }) {
  const resolvedHref = resolveHref(to, basename ?? (0, import_routing.getBasename)());
  if (typeof window !== "undefined") {
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (resolvedHref !== currentHref) {
      setTimeout(() => {
        if (isExternal(resolvedHref)) {
          if (replace) {
            window.location.replace(resolvedHref);
          } else {
            window.location.assign(resolvedHref);
          }
          return;
        }
        navigateWithClientRouter(resolvedHref, replace ? "replace" : "push");
      }, 0);
    }
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Link,
  Redirect
});
