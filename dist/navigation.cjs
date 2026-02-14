"use client";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/navigation.tsx
var navigation_exports = {};
__export(navigation_exports, {
  Link: () => Link,
  Redirect: () => Redirect
});
module.exports = __toCommonJS(navigation_exports);
var import_jsx_runtime = require("react/jsx-runtime");
function getDefaultBasename() {
  const globalValue = globalThis.__RSC_BASENAME;
  if (globalValue && globalValue !== "/") {
    return globalValue;
  }
  if (typeof window === "undefined") {
    return "";
  }
  const value = window.__RSC_BASENAME;
  return value && value !== "/" ? value : "";
}
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
function Link({ to, basename, onClick, ...rest }) {
  const resolvedHref = resolveHref(to, basename ?? getDefaultBasename());
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "a",
    {
      ...rest,
      href: resolvedHref,
      onClick: (event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        if (rest.target && rest.target !== "_self") {
          return;
        }
        if (isExternal(resolvedHref)) {
          return;
        }
        const router = getClientRouter();
        if (!router) {
          return;
        }
        event.preventDefault();
        router.push(resolvedHref);
      }
    }
  );
}
function Redirect({ to, basename, replace = true }) {
  const resolvedHref = resolveHref(to, basename ?? getDefaultBasename());
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
        const router = getClientRouter();
        if (router) {
          if (replace) {
            router.replace(resolvedHref);
          } else {
            router.push(resolvedHref);
          }
          return;
        }
        if (replace) {
          window.location.replace(resolvedHref);
        } else {
          window.location.assign(resolvedHref);
        }
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
//# sourceMappingURL=navigation.cjs.map
