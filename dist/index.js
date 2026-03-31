var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/server.ts
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { createRequire } from "node:module";
import { renderToPipeableStream } from "react-server-dom-webpack/server";
import * as reactServerDomClientNode from "react-server-dom-webpack/client.node";
function defaultOnError(err) {
  console.error("[webframez-react] RSC render error", err);
}
function createHTMLShell(options = {}) {
  const {
    title = "RSC App",
    rscEndpoint = "/rsc",
    clientScriptUrl = "/client.js",
    headTags = "",
    rootHtml = "",
    initialFlightData = "",
    basename = "",
    routeBasePath = "",
    liveReloadPath,
    liveReloadServerId
  } = options;
  const escapedInitialFlightData = initialFlightData ? JSON.stringify(initialFlightData).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") : '""';
  const liveReloadScript = liveReloadPath && liveReloadServerId ? `<script>
(() => {
  const endpoint = ${JSON.stringify(liveReloadPath)};
  let currentServerId = ${JSON.stringify(liveReloadServerId)};

  const connect = () => {
    const source = new EventSource(endpoint);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const nextServerId =
          data && typeof data.serverId === "string" ? data.serverId : "";

        if (nextServerId && nextServerId !== currentServerId) {
          currentServerId = nextServerId;
          window.location.reload();
        }
      } catch {
        // Ignore malformed payloads in dev mode.
      }
    };

    source.onerror = () => {
      source.close();
      setTimeout(connect, 350);
    };
  };

  connect();
})();
</script>` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${headTags}
  </head>
  <body>
    <div id="root">${rootHtml}</div>
    <script>window.__RSC_ENDPOINT = "${rscEndpoint}";</script>
    <script>window.__RSC_BASENAME = "${basename}";</script>
    <script>window.__RSC_ROUTE_BASE_PATH = "${routeBasePath}";</script>
    <script>window.__RSC_INITIAL_PAYLOAD = ${escapedInitialFlightData};</script>
    <script type="module" src="${clientScriptUrl}"></script>
    ${liveReloadScript}
  </body>
</html>`;
}
function renderRSCToString(payload, options = {}) {
  const {
    moduleMap = {},
    onError = defaultOnError
  } = options;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        const normalized = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
        chunks.push(normalized);
        callback();
      }
    });
    writable.on("finish", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    writable.on("error", reject);
    const stream = renderToPipeableStream(payload, moduleMap, { onError });
    stream.pipe(writable);
  });
}
function sendRSC(res, model, options = {}) {
  const {
    moduleMap = {},
    onError = defaultOnError,
    statusCode = 200,
    contentType = "text/x-component"
  } = options;
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  const stream = renderToPipeableStream(model, moduleMap, { onError });
  stream.pipe(res);
  return stream;
}
function createRSCHandler(options) {
  const {
    rscPath = "/rsc",
    getModel,
    moduleMap = {},
    onError = defaultOnError
  } = options;
  if (typeof getModel !== "function") {
    throw new Error("createRSCHandler requires a getModel(req) function");
  }
  return async function rscHandler(req, res) {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname !== rscPath) {
      return false;
    }
    try {
      const model = await getModel(req);
      sendRSC(res, model, { moduleMap, onError });
      return true;
    } catch (err) {
      onError(err);
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
      res.end("RSC render error");
      return true;
    }
  };
}

// src/file-router.tsx
import fs from "node:fs";
import Module from "node:module";
import path2 from "node:path";

// src/head.ts
var ABSOLUTE_ASSET_URL_PATTERN = /^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|\/\/|#)/;
function normalizeHeadBasename(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}
function resolveHeadAssetUrl(assetUrl, basename) {
  const normalizedAssetUrl = assetUrl.trim();
  const normalizedBasename = normalizeHeadBasename(basename);
  if (!normalizedAssetUrl || !normalizedBasename) {
    return normalizedAssetUrl;
  }
  if (ABSOLUTE_ASSET_URL_PATTERN.test(normalizedAssetUrl)) {
    return normalizedAssetUrl;
  }
  if (normalizedAssetUrl.startsWith("/")) {
    return normalizedAssetUrl;
  }
  if (normalizedBasename !== "/" && (normalizedAssetUrl === normalizedBasename || normalizedAssetUrl.startsWith(`${normalizedBasename}/`))) {
    return normalizedAssetUrl;
  }
  if (normalizedBasename === "/") {
    return normalizedAssetUrl.startsWith("/") ? normalizedAssetUrl : `/${normalizedAssetUrl}`;
  }
  if (normalizedAssetUrl.startsWith("/")) {
    return `${normalizedBasename}${normalizedAssetUrl}`;
  }
  return `${normalizedBasename}/${normalizedAssetUrl}`;
}
function normalizeHeadConfig(head, inheritedBasename) {
  if (!head) {
    return void 0;
  }
  const effectiveBasename = normalizeHeadBasename(head.basename) ?? normalizeHeadBasename(inheritedBasename);
  const normalizedRouteBasePath = normalizeHeadBasename(head.routeBasePath);
  const normalizedTransportBasePath = normalizeHeadBasename(
    head.transportBasePath
  );
  const normalizedHead = {
    ...head,
    ...effectiveBasename !== void 0 ? { basename: effectiveBasename } : {},
    ...normalizedRouteBasePath !== void 0 ? { routeBasePath: normalizedRouteBasePath } : {},
    ...normalizedTransportBasePath !== void 0 ? { transportBasePath: normalizedTransportBasePath } : {}
  };
  if (normalizedHead.favicon) {
    normalizedHead.favicon = resolveHeadAssetUrl(
      normalizedHead.favicon,
      effectiveBasename
    );
  }
  if (normalizedHead.links) {
    normalizedHead.links = normalizedHead.links.map((link) => ({
      ...link,
      href: resolveHeadAssetUrl(link.href, effectiveBasename)
    }));
  }
  return normalizedHead;
}

// src/router-runtime.tsx
import React from "react";
var ROUTE_CHILDREN_TAG = "webframez-route-children";
var ROUTE_CHILDREN_SENTINEL = "__webframezRouteChildren";
var ROUTE_CHILDREN_DISPLAY_NAME = "WebframezRouteChildren";
var RouteChildrenImpl = () => React.createElement(ROUTE_CHILDREN_TAG);
RouteChildrenImpl.displayName = ROUTE_CHILDREN_DISPLAY_NAME;
RouteChildrenImpl[ROUTE_CHILDREN_SENTINEL] = true;
var RouteChildren = RouteChildrenImpl;
function isRouteChildrenType(type) {
  if (type === ROUTE_CHILDREN_TAG || type === RouteChildren) {
    return true;
  }
  if (!type || typeof type !== "function" && typeof type !== "object") {
    return false;
  }
  try {
    const candidate = type;
    return candidate[ROUTE_CHILDREN_SENTINEL] === true || candidate.displayName === ROUTE_CHILDREN_DISPLAY_NAME || candidate.name === "RouteChildren";
  } catch {
    return false;
  }
}
function injectRouteChildren(node, routeChildren) {
  if (node === null || node === void 0 || typeof node === "boolean") {
    return node;
  }
  if (Array.isArray(node)) {
    let changed = false;
    const next = node.map((child) => {
      const injected = injectRouteChildren(child, routeChildren);
      if (injected !== child) {
        changed = true;
      }
      return injected;
    });
    return changed ? next : node;
  }
  if (!React.isValidElement(node)) {
    return node;
  }
  if (isRouteChildrenType(node.type)) {
    return routeChildren;
  }
  const props = node.props;
  if (!("children" in props)) {
    return node;
  }
  const nextChildren = injectRouteChildren(props.children, routeChildren);
  if (nextChildren === props.children) {
    return node;
  }
  if (Array.isArray(nextChildren)) {
    return React.cloneElement(node, void 0, ...nextChildren);
  }
  return React.cloneElement(node, void 0, nextChildren);
}

// src/file-router.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var FORCED_PACKAGE_REQUESTS = [
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
  "scheduler"
];
var forcedPackageResolutionInstalled = false;
function normalizePathname(pathname) {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
function splitSegments(pathname) {
  const normalized = normalizePathname(pathname);
  if (normalized === "/") {
    return [];
  }
  return normalized.slice(1).split("/").filter(Boolean);
}
function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const result = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path2.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        result.push(fullPath);
      }
    }
  }
  return result;
}
function readSearchParams(urlSearchParams) {
  const output = {};
  for (const key of urlSearchParams.keys()) {
    const values = urlSearchParams.getAll(key);
    output[key] = values.length <= 1 ? values[0] ?? "" : values;
  }
  return output;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}
var MANAGED_HEAD_ATTR = "data-webframez-head";
function createManagedAttributes() {
  return `${MANAGED_HEAD_ATTR}="true"`;
}
function shouldForcePackageResolution(request) {
  return FORCED_PACKAGE_REQUESTS.some(
    (candidate) => request === candidate || request.startsWith(`${candidate}/`)
  );
}
function installForcedPackageResolution() {
  if (forcedPackageResolutionInstalled) {
    return;
  }
  const moduleWithPrivateResolver = Module;
  const originalResolveFilename = moduleWithPrivateResolver._resolveFilename;
  const rootParent = {
    id: "__webframez_react_runtime__",
    filename: path2.join(process.cwd(), "__webframez_react_runtime__.js"),
    path: process.cwd(),
    paths: moduleWithPrivateResolver._nodeModulePaths(process.cwd())
  };
  moduleWithPrivateResolver._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
    if (typeof request === "string" && shouldForcePackageResolution(request)) {
      try {
        return originalResolveFilename.call(this, request, rootParent, false, options);
      } catch {
      }
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
  forcedPackageResolutionInstalled = true;
}
function toRouteEntry(pagesDir, filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.endsWith("/index.js")) {
    return null;
  }
  const relativeDir = path2.dirname(path2.relative(pagesDir, filePath)).replace(/\\/g, "/");
  const segments = relativeDir === "." ? [] : relativeDir.split("/").filter(Boolean);
  const staticCount = segments.filter((segment) => !segment.startsWith("[")).length;
  const catchAllCount = segments.filter(
    (segment) => segment.startsWith("[...") && segment.endsWith("]")
  ).length;
  return {
    filePath,
    segments,
    staticCount,
    catchAllCount
  };
}
function matchRoute(entry, pathname) {
  const targetSegments = splitSegments(pathname);
  const params = {};
  for (let index = 0; index < entry.segments.length; index += 1) {
    const routeSegment = entry.segments[index];
    const isCatchAll = routeSegment.startsWith("[...") && routeSegment.endsWith("]");
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
function mergeHead(...configs) {
  const merged = {
    meta: [],
    links: []
  };
  for (const candidate of configs) {
    const config = normalizeHeadConfig(candidate, merged.basename);
    if (!config) {
      continue;
    }
    if (config.title) {
      merged.title = config.title;
    }
    if (config.description) {
      merged.description = config.description;
    }
    if (config.basename) {
      merged.basename = config.basename;
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
function renderHeadToString(head) {
  const normalizedHead = normalizeHeadConfig(head) ?? head;
  const tags = [];
  if (normalizedHead.description) {
    tags.push(
      `<meta ${createManagedAttributes()} name="description" content="${escapeHtml(normalizedHead.description)}" />`
    );
  }
  if (normalizedHead.favicon) {
    tags.push(
      `<link ${createManagedAttributes()} rel="icon" href="${escapeHtml(normalizedHead.favicon)}" />`
    );
  }
  for (const meta of normalizedHead.meta ?? []) {
    const attrs = Object.entries(meta).filter(([, value]) => Boolean(value)).map(([key, value]) => `${key}="${escapeHtml(String(value))}"`).join(" ");
    tags.push(`<meta ${createManagedAttributes()} ${attrs} />`);
  }
  for (const link of normalizedHead.links ?? []) {
    const attrs = Object.entries(link).filter(([, value]) => Boolean(value)).map(([key, value]) => `${key}="${escapeHtml(String(value))}"`).join(" ");
    tags.push(`<link ${createManagedAttributes()} ${attrs} />`);
  }
  return tags.join("\n");
}
function clearModuleCache(modulePath, rootDir, visited = /* @__PURE__ */ new Set()) {
  const resolvedPath = __require.resolve(modulePath);
  if (visited.has(resolvedPath)) {
    return;
  }
  visited.add(resolvedPath);
  const cachedModule = __require.cache[resolvedPath];
  if (!cachedModule) {
    return;
  }
  for (const child of cachedModule.children) {
    if (child.id.startsWith(rootDir)) {
      clearModuleCache(child.id, rootDir, visited);
    }
  }
  delete __require.cache[resolvedPath];
}
function resolveModule(modulePath, rootDir) {
  clearModuleCache(modulePath, rootDir);
  return __require(modulePath);
}
async function resolveHead(candidate, context) {
  if (!candidate.Head) {
    return void 0;
  }
  return candidate.Head(context);
}
async function resolvePageData(candidate, context) {
  if (!candidate.Data) {
    return void 0;
  }
  return candidate.Data(context);
}
function findBestMatch(entries, pathname) {
  const matches = [];
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
function normalizeAbortStatus(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 404;
  }
  const normalized = Math.trunc(value);
  if (normalized < 100 || normalized > 599) {
    return 404;
  }
  return normalized;
}
function createAbort(options) {
  return {
    __webframezRouteAbort: true,
    statusCode: normalizeAbortStatus(options?.status),
    message: options?.message?.trim() || "Page not found",
    payload: options?.payload
  };
}
function isRouteAbort(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  try {
    return value.__webframezRouteAbort === true;
  } catch {
    return false;
  }
}
function createFileRouter(options) {
  installForcedPackageResolution();
  const pagesDir = options.pagesDir;
  const layoutPath = path2.join(pagesDir, "layout.js");
  const errorPath = path2.join(pagesDir, "errors.js");
  const middlewaresPath = path2.join(pagesDir, "middlewares.js");
  function buildRouteEntries() {
    const files = walkFiles(pagesDir);
    return files.map((filePath) => toRouteEntry(pagesDir, filePath)).filter((entry) => entry !== null).sort((a, b) => {
      if (b.staticCount !== a.staticCount) {
        return b.staticCount - a.staticCount;
      }
      if (a.catchAllCount !== b.catchAllCount) {
        return a.catchAllCount - b.catchAllCount;
      }
      return b.segments.length - a.segments.length;
    });
  }
  async function renderError(context, statusCode, message, payload) {
    const errorProps = {
      ...context,
      statusCode,
      message,
      payload
    };
    const layoutModule = fs.existsSync(layoutPath) ? resolveModule(layoutPath, pagesDir) : null;
    if (!fs.existsSync(errorPath)) {
      const fallback = /* @__PURE__ */ jsxs("main", { style: { fontFamily: "system-ui, sans-serif", padding: 24 }, children: [
        /* @__PURE__ */ jsx("h1", { children: statusCode }),
        /* @__PURE__ */ jsx("p", { children: message })
      ] });
      return {
        statusCode,
        model: fallback,
        head: {
          title: `${statusCode} - ${message}`
        }
      };
    }
    const errorModule = resolveModule(errorPath, pagesDir);
    const errorNode = await errorModule.default(errorProps);
    const layoutHead = layoutModule ? await resolveHead(layoutModule, context) : void 0;
    const errorHead = await resolveHead(errorModule, errorProps);
    const layoutNode = layoutModule ? await layoutModule.default(context) : null;
    const model = layoutNode ? injectRouteChildren(layoutNode, errorNode) : errorNode;
    return {
      statusCode,
      model,
      head: mergeHead(layoutHead, errorHead)
    };
  }
  function normalizeMiddlewareNames(config) {
    if (!config) {
      return [];
    }
    return Array.isArray(config) ? config : [config];
  }
  function isPlainObject(value) {
    if (!value || typeof value !== "object") {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }
  function mergeRouteData(currentData, nextData) {
    if (typeof nextData === "undefined") {
      return currentData;
    }
    if (isPlainObject(currentData) && isPlainObject(nextData)) {
      return {
        ...currentData,
        ...nextData
      };
    }
    return nextData;
  }
  async function resolveMiddlewares(config, context) {
    const middlewareNames = normalizeMiddlewareNames(config);
    const requiresNamedMiddleware = middlewareNames.length > 0;
    if (!fs.existsSync(middlewaresPath)) {
      if (!requiresNamedMiddleware) {
        return context;
      }
      throw createAbort({
        status: 500,
        message: `Invalid middleware '${middlewareNames[0]}'`
      });
    }
    const middlewareModule = resolveModule(
      middlewaresPath,
      pagesDir
    );
    const registry = middlewareModule.middlewares;
    if (!registry) {
      if (!requiresNamedMiddleware) {
        return context;
      }
      throw createAbort({
        status: 500,
        message: `Invalid middleware '${middlewareNames[0]}'`
      });
    }
    const orderedMiddlewareNames = typeof registry["*"] === "function" ? ["*", ...middlewareNames] : middlewareNames;
    if (orderedMiddlewareNames.length === 0) {
      return context;
    }
    let nextContext = context;
    for (const middlewareName of orderedMiddlewareNames) {
      const middleware = registry[middlewareName];
      if (typeof middleware !== "function") {
        throw createAbort({
          status: 500,
          message: `Invalid middleware '${middlewareName}'`
        });
      }
      const middlewareData = await middleware(nextContext);
      nextContext = {
        ...nextContext,
        data: mergeRouteData(nextContext.data, middlewareData)
      };
    }
    return nextContext;
  }
  async function resolve(input) {
    const pathname = normalizePathname(input.pathname);
    const contextBase = {
      pathname,
      params: {},
      searchParams: input.searchParams,
      cookies: input.cookies ?? {},
      request: input.request ?? {
        host: null,
        pathname,
        originalPathname: pathname,
        headers: {}
      },
      abort: (options2) => {
        throw createAbort(options2);
      }
    };
    let activeContext = contextBase;
    try {
      const entries = buildRouteEntries();
      const match = findBestMatch(entries, pathname);
      if (!match) {
        return renderError(contextBase, 404, "Page not found");
      }
      const context = {
        ...contextBase,
        params: match.params
      };
      activeContext = context;
      const pageModule = resolveModule(match.entry.filePath, pagesDir);
      const layoutModule = fs.existsSync(layoutPath) ? resolveModule(layoutPath, pagesDir) : null;
      const middlewareContext = await resolveMiddlewares(pageModule.middlewares, context);
      activeContext = middlewareContext;
      const pageData = await resolvePageData(pageModule, middlewareContext);
      const pageContext = {
        ...middlewareContext,
        data: mergeRouteData(middlewareContext.data, pageData)
      };
      activeContext = pageContext;
      const pageNode = await pageModule.default(pageContext);
      const layoutHead = layoutModule ? await resolveHead(layoutModule, pageContext) : void 0;
      const pageHead = await resolveHead(pageModule, pageContext);
      const layoutNode = layoutModule ? await layoutModule.default(pageContext) : null;
      const model = layoutNode ? injectRouteChildren(layoutNode, pageNode) : pageNode;
      return {
        statusCode: 200,
        model,
        head: mergeHead(layoutHead, pageHead)
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
    readSearchParams
  };
}
function parseSearchParams(query) {
  return readSearchParams(query);
}

// src/http.ts
import fs2 from "node:fs";
import path3 from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
function createInitialHtmlErrorMarkup(message) {
  return `<main style="font-family:system-ui,sans-serif;padding:24px"><h1 style="margin:0 0 12px">500</h1><p style="margin:0">${message}</p></main>`;
}
var INITIAL_HTML_WORKER_SCRIPT = `
const path = require("node:path");
const Module = require("node:module");
const { Readable, Writable } = require("node:stream");
const reactServerDomClientNode = require("react-server-dom-webpack/client.node");

const originalResolveFilename = Module._resolveFilename;
const rootParent = {
  id: "__webframez_react_worker__",
  filename: path.join(process.cwd(), "__webframez_react_worker__.js"),
  path: process.cwd(),
  paths: Module._nodeModulePaths(process.cwd()),
};
const forcedPackageRequests = [
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
  "scheduler"
];

function shouldForcePackageResolution(request) {
  return forcedPackageRequests.some((candidate) =>
    request === candidate || request.startsWith(candidate + "/")
  );
}

Module._resolveFilename = function(request, parent, isMain, options) {
  if (typeof request === "string" && shouldForcePackageResolution(request)) {
    return originalResolveFilename.call(this, request, rootParent, false, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const reactDomPkg = require.resolve("react-dom/package.json", {
  paths: [process.cwd()]
});
const reactDomServer = require(path.join(path.dirname(reactDomPkg), "server.node.js"));
globalThis.__webpack_chunk_load__ = function __webframezNoopChunkLoad() {
  return Promise.resolve();
};
globalThis.__webpack_require__ = function __webframezNodeRequire(id) {
  if (typeof id !== "string") {
    return require(id);
  }

  if (id.startsWith("./")) {
    const relativeId = id.slice(2);
    const candidates = [
      path.resolve(process.cwd(), relativeId),
      path.resolve(process.cwd(), "..", relativeId)
    ];
    for (const candidate of candidates) {
      try {
        return require(candidate);
      } catch (error) {
        const missingCandidate = error && error.code === "MODULE_NOT_FOUND" && typeof error.message === "string" && error.message.includes("'" + candidate + "'");
        if (!missingCandidate) {
          throw error;
        }
      }
    }
  }

  return require(id);
};

function renderHtml(model) {
  return new Promise((resolve, reject) => {
    let didError = false;
    const chunks = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        const normalized =
          typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
        chunks.push(normalized);
        callback();
      }
    });

    writable.on("finish", () => {
      if (didError) {
        reject(new Error("Initial HTML stream finished after a render error."));
        return;
      }

      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    writable.on("error", reject);

    const stream = reactDomServer.renderToPipeableStream(model, {
      onAllReady() {
        stream.pipe(writable);
      },
      onError(error) {
        didError = true;
        reject(error);
      }
    });
  });
}

function createReadableStreamFromString(value) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(value));
      controller.close();
    }
  });
}

async function decodeFlightPayloadFromString(flightData, moduleMap) {
  const serverConsumerManifest = {
    moduleMap: moduleMap || {},
    serverModuleMap: null,
    moduleLoading: null
  };

  if (typeof reactServerDomClientNode.createFromNodeStream === "function") {
    return await reactServerDomClientNode.createFromNodeStream(
      Readable.from([flightData]),
      serverConsumerManifest
    );
  }

  if (typeof reactServerDomClientNode.createFromReadableStream === "function") {
    return await reactServerDomClientNode.createFromReadableStream(
      createReadableStreamFromString(flightData),
      { serverConsumerManifest }
    );
  }

  throw new Error(
    "react-server-dom-webpack/client.node does not provide createFromNodeStream or createFromReadableStream."
  );
}

async function renderHtmlFromFlightData(flightData, moduleMap) {
  const payload = await decodeFlightPayloadFromString(flightData, moduleMap);

  const model =
    payload && typeof payload === "object" && "model" in payload
      ? payload.model
      : payload;

  return renderHtml(model);
}

process.on("message", async (message) => {
  if (!message || message.type !== "render-flight") {
    return;
  }

  try {
    const html = await renderHtmlFromFlightData(
      message.payload.flightData || "",
      message.payload.moduleMap || {},
    );

    if (typeof process.send === "function") {
      process.send({ id: message.id, ok: true, html });
    }
  } catch (error) {
    const formatted = error && (error.stack || String(error))
      ? (error.stack || String(error))
      : "Unknown SSR worker error";
    if (typeof process.send === "function") {
      process.send({ id: message.id, ok: false, error: formatted });
    }
  }
});
`;
function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}
function normalizeRequestHostValue(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const firstValue = trimmed.split(",")[0]?.trim() || "";
  if (!firstValue) {
    return null;
  }
  if (firstValue.startsWith("[")) {
    const closingIndex = firstValue.indexOf("]");
    if (closingIndex > 0) {
      return firstValue.slice(1, closingIndex).toLowerCase();
    }
  }
  return firstValue.replace(/:\d+$/, "").toLowerCase();
}
function getRequestHost(req) {
  const candidates = [
    req.headers["x-forwarded-host"],
    req.headers["x-original-host"],
    req.headers.host
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const singleValue of candidate) {
        if (typeof singleValue !== "string") {
          continue;
        }
        const normalized2 = normalizeRequestHostValue(singleValue);
        if (normalized2) {
          return normalized2;
        }
      }
      continue;
    }
    if (typeof candidate !== "string") {
      continue;
    }
    const normalized = normalizeRequestHostValue(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}
function createRouteRequestContext(req, pathname, originalPathname) {
  return {
    host: getRequestHost(req),
    pathname,
    originalPathname,
    headers: req.headers
  };
}
function stripBasePath(pathname, basePath) {
  if (!basePath) {
    return pathname;
  }
  if (pathname === basePath) {
    return "/";
  }
  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }
  return pathname;
}
function normalizeRuntimeBasePath(value) {
  if (typeof value !== "string") {
    return void 0;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}
function joinRuntimeBasePath(basePath, pathname) {
  const normalizedPath = !pathname || pathname === "/" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!basePath) {
    return normalizedPath;
  }
  return normalizedPath === "/" ? basePath : `${basePath}${normalizedPath}`;
}
function sanitizeInitialHtmlWorkerNodeOptions(rawNodeOptions) {
  if (!rawNodeOptions || rawNodeOptions.trim() === "") {
    return "";
  }
  return rawNodeOptions.replace(/(^|\s)--conditions\s+react-server(?=\s|$)/g, " ").replace(/(^|\s)-r\s+(\S*webframez-react\/register)(?=\s|$)/g, " ").replace(/\s+/g, " ").trim();
}
function createInitialHtmlWorker(_pagesDir) {
  let child = null;
  let nextRequestId = 1;
  let stderrBuffer = "";
  const pending = /* @__PURE__ */ new Map();
  const rejectPending = (error) => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timeout);
      entry.reject(error);
    }
    pending.clear();
  };
  const stopWorker = () => {
    if (!child) {
      return;
    }
    child.removeAllListeners();
    if (!child.killed) {
      child.kill();
    }
    child = null;
  };
  const startWorker = () => {
    if (child && child.connected && !child.killed) {
      return child;
    }
    stderrBuffer = "";
    child = spawn(process.execPath, ["-e", INITIAL_HTML_WORKER_SCRIPT], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_OPTIONS: sanitizeInitialHtmlWorkerNodeOptions(process.env.NODE_OPTIONS)
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"]
    });
    child.on("message", (message) => {
      if (!message || typeof message.id !== "number") {
        return;
      }
      const entry = pending.get(message.id);
      if (!entry) {
        return;
      }
      pending.delete(message.id);
      clearTimeout(entry.timeout);
      if (message.ok) {
        entry.resolve(message.html);
        return;
      }
      entry.reject(new Error(message.error));
    });
    child.stderr?.on("data", (chunk) => {
      stderrBuffer = `${stderrBuffer}${chunk.toString("utf8")}`.slice(-8192);
    });
    child.on("exit", (code, signal) => {
      const suffix = stderrBuffer.trim() !== "" ? `
${stderrBuffer.trim()}` : "";
      rejectPending(
        new Error(
          `[webframez-react] Initial HTML worker exited (${signal ?? code ?? "unknown"})${suffix}`
        )
      );
      child = null;
    });
    child.on("error", (error) => {
      rejectPending(error instanceof Error ? error : new Error(String(error)));
      child = null;
    });
    return child;
  };
  return {
    renderFromFlightData(payload) {
      const activeChild = startWorker();
      const requestId = nextRequestId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          rejectPending(new Error("[webframez-react] Initial HTML worker timed out"));
          stopWorker();
        }, 1e4);
        pending.set(requestId, { resolve, reject, timeout });
        const request = {
          id: requestId,
          type: "render-flight",
          payload
        };
        activeChild.send(request, (error) => {
          if (!error) {
            return;
          }
          const entry = pending.get(requestId);
          if (!entry) {
            return;
          }
          pending.delete(requestId);
          clearTimeout(entry.timeout);
          entry.reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    },
    dispose() {
      rejectPending(new Error("[webframez-react] Initial HTML worker disposed"));
      stopWorker();
    }
  };
}
function withRequestBasename(basename, fn) {
  const target = globalThis;
  const previous = target.__RSC_BASENAME;
  target.__RSC_BASENAME = basename;
  const finish = () => {
    target.__RSC_BASENAME = previous;
  };
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      return result.finally(finish);
    }
    finish();
    return result;
  } catch (error) {
    finish();
    throw error;
  }
}
function parseCookies(rawCookieHeader) {
  const raw = Array.isArray(rawCookieHeader) ? rawCookieHeader.join("; ") : rawCookieHeader ?? "";
  const output = {};
  if (!raw || raw.trim() === "") {
    return output;
  }
  for (const pair of raw.split(";")) {
    const part = pair.trim();
    if (!part) {
      continue;
    }
    const eqIndex = part.indexOf("=");
    const name = eqIndex >= 0 ? part.slice(0, eqIndex).trim() : part.trim();
    const value = eqIndex >= 0 ? part.slice(eqIndex + 1).trim() : "";
    if (!name) {
      continue;
    }
    output[name] = decodeURIComponent(value);
  }
  return output;
}
function normalizeClientManifest(manifest, options) {
  const normalized = { ...manifest };
  const candidateNodeModulesDirs = /* @__PURE__ */ new Set([
    path3.resolve(options.cwd, "node_modules"),
    path3.resolve(options.distRootDir, "..", "..", "node_modules")
  ]);
  const addAlias = (aliasKey, value) => {
    if (!(aliasKey in normalized)) {
      normalized[aliasKey] = value;
    }
  };
  for (const [key, value] of Object.entries(manifest)) {
    if (!key.startsWith("file://")) {
      continue;
    }
    let absolutePath = "";
    try {
      absolutePath = fileURLToPath(key);
    } catch {
      continue;
    }
    const marker = `${path3.sep}node_modules${path3.sep}`;
    const markerIndex = absolutePath.lastIndexOf(marker);
    if (markerIndex < 0) {
      continue;
    }
    const relativeModulePath = absolutePath.slice(markerIndex + marker.length);
    const relativeModulePathPosix = relativeModulePath.split(path3.sep).join("/");
    addAlias(`./node_modules/${relativeModulePathPosix}`, value);
    addAlias(`node_modules/${relativeModulePathPosix}`, value);
    addAlias(absolutePath, value);
    for (const nodeModulesDir of candidateNodeModulesDirs) {
      const aliasPath = path3.join(nodeModulesDir, relativeModulePath);
      addAlias(aliasPath, value);
      addAlias(pathToFileURL(aliasPath).href, value);
    }
  }
  return normalized;
}
function createServerConsumerManifest(manifest) {
  const consumerManifest = {};
  const normalizeWorkerModuleId = (requestKey, rawModuleId) => {
    if (typeof rawModuleId === "string" && rawModuleId.trim() !== "") {
      return rawModuleId;
    }
    if (typeof rawModuleId !== "number" || !Number.isFinite(rawModuleId)) {
      return null;
    }
    if (!requestKey || requestKey.trim() === "") {
      return String(rawModuleId);
    }
    if (requestKey.startsWith("file://")) {
      try {
        return fileURLToPath(requestKey);
      } catch {
        return String(rawModuleId);
      }
    }
    if (requestKey.startsWith("/")) {
      return requestKey;
    }
    if (requestKey.startsWith("./")) {
      return requestKey;
    }
    if (requestKey.startsWith("node_modules/") || requestKey.startsWith("build/")) {
      return `./${requestKey}`;
    }
    return requestKey;
  };
  const addReference = (lookupKey, reference) => {
    if (!lookupKey || lookupKey.trim() === "") {
      return;
    }
    if (lookupKey in consumerManifest) {
      return;
    }
    consumerManifest[lookupKey] = {
      "*": reference
    };
  };
  for (const [key, value] of Object.entries(manifest)) {
    if (!value || typeof value !== "object") {
      continue;
    }
    const entry = value;
    const workerModuleId = normalizeWorkerModuleId(key, entry.id);
    if (!workerModuleId) {
      continue;
    }
    const reference = {
      id: workerModuleId,
      chunks: Array.isArray(entry.chunks) ? entry.chunks : [],
      name: entry.name ?? "*",
      ...entry.async ? { async: entry.async } : {}
    };
    addReference(key, reference);
    if (typeof entry.id === "number" && Number.isFinite(entry.id)) {
      addReference(String(entry.id), reference);
    }
  }
  return consumerManifest;
}
function createNodeRequestHandler(options) {
  const devServerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const distRootDir = path3.resolve(options.distRootDir);
  const pagesDir = path3.resolve(options.pagesDir ?? path3.join(distRootDir, "pages"));
  const manifestPath = path3.resolve(
    options.manifestPath ?? path3.join(distRootDir, "react-client-manifest.json")
  );
  const assetsPrefix = options.assetsPrefix ?? "/assets/";
  const rscPath = options.rscPath ?? "/rsc";
  const clientScriptUrl = options.clientScriptUrl ?? "/assets/client.js";
  const basePath = normalizeBasePath(options.basePath);
  const nodeEnv = process.env.NODE_ENV || "";
  const runningInWatchMode = Array.isArray(process.execArgv) && process.execArgv.includes("--watch");
  const liveReloadEnabled = options.liveReloadPath !== false && (nodeEnv === "development" || runningInWatchMode);
  const liveReloadPath = !liveReloadEnabled ? "" : options.liveReloadPath ?? `${basePath || ""}/__webframez_live_reload`;
  const liveReloadClients = /* @__PURE__ */ new Set();
  const router = createFileRouter({ pagesDir });
  const moduleMap = normalizeClientManifest(
    JSON.parse(fs2.readFileSync(manifestPath, "utf-8")),
    {
      distRootDir,
      cwd: process.cwd()
    }
  );
  const serverConsumerModuleMap = createServerConsumerManifest(moduleMap);
  const initialHtmlWorker = createInitialHtmlWorker(pagesDir);
  const disposeInitialHtmlWorker = () => {
    initialHtmlWorker.dispose();
  };
  process.once("exit", disposeInitialHtmlWorker);
  process.once("SIGINT", disposeInitialHtmlWorker);
  process.once("SIGTERM", disposeInitialHtmlWorker);
  return async function handleRequest(req, res) {
    if (!req.url) {
      res.statusCode = 400;
      res.end("Bad request");
      return;
    }
    const url = new URL(req.url, "http://localhost");
    const requestCookies = parseCookies(req.headers.cookie);
    if (liveReloadPath && url.pathname === liveReloadPath) {
      const accept = String(req.headers.accept || "");
      if (accept.includes("text/event-stream")) {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        if (typeof res.flushHeaders === "function") {
          res.flushHeaders();
        }
        res.write(`retry: 400
`);
        res.write(`data: ${JSON.stringify({ serverId: devServerId })}

`);
        liveReloadClients.add(res);
        const heartbeat = setInterval(() => {
          if (!res.writableEnded && !res.destroyed) {
            res.write(`: ping

`);
          }
        }, 15e3);
        const cleanup = () => {
          clearInterval(heartbeat);
          liveReloadClients.delete(res);
        };
        req.on("close", cleanup);
        res.on("close", cleanup);
        return;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.end(JSON.stringify({ serverId: devServerId, clients: liveReloadClients.size }));
      return;
    }
    if (url.pathname === rscPath) {
      const pathname = stripBasePath(url.searchParams.get("path") || "/", basePath);
      const requestContext = createRouteRequestContext(
        req,
        pathname,
        url.searchParams.get("path") || "/"
      );
      const search = new URLSearchParams(url.searchParams.get("search") || "");
      const resolved2 = await withRequestBasename(
        basePath,
        () => router.resolve({
          pathname,
          searchParams: parseSearchParams(search),
          cookies: requestCookies,
          request: requestContext
        })
      );
      const payload = {
        model: resolved2.model,
        head: resolved2.head
      };
      sendRSC(res, payload, {
        moduleMap,
        statusCode: resolved2.statusCode
      });
      return;
    }
    if (url.pathname.startsWith(assetsPrefix)) {
      const relative = url.pathname.slice(assetsPrefix.length);
      const filePath = path3.resolve(distRootDir, relative);
      if (!filePath.startsWith(distRootDir)) {
        res.statusCode = 400;
        res.end("Invalid path");
        return;
      }
      const ext = path3.extname(filePath);
      if (ext === ".js" || ext === ".mjs") {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      } else if (ext === ".json") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      const stream = fs2.createReadStream(filePath);
      stream.on("error", () => {
        res.statusCode = 404;
        res.end("Not found");
      });
      stream.pipe(res);
      return;
    }
    const resolved = await withRequestBasename(
      basePath,
      () => router.resolve({
        pathname: stripBasePath(url.pathname, basePath),
        searchParams: parseSearchParams(url.searchParams),
        cookies: requestCookies,
        request: createRouteRequestContext(
          req,
          stripBasePath(url.pathname, basePath),
          url.pathname
        )
      })
    );
    const initialPayload = {
      model: resolved.model,
      head: resolved.head
    };
    const initialFlightData = await renderRSCToString(initialPayload, {
      moduleMap
    });
    const transportBasePath = normalizeRuntimeBasePath(resolved.head.transportBasePath) ?? normalizeRuntimeBasePath(basePath) ?? "";
    const shellClientScriptUrl = joinRuntimeBasePath(
      transportBasePath,
      "/assets/client.js"
    );
    const shellRscEndpoint = joinRuntimeBasePath(transportBasePath, "/rsc");
    const shellBasename = normalizeRuntimeBasePath(resolved.head.basename) ?? normalizeRuntimeBasePath(basePath) ?? "";
    const shellRouteBasePath = normalizeRuntimeBasePath(resolved.head.routeBasePath) ?? "";
    let rootHtml = "";
    try {
      rootHtml = await initialHtmlWorker.renderFromFlightData({
        flightData: initialFlightData,
        moduleMap: serverConsumerModuleMap
      });
    } catch (error) {
      console.error("[webframez-react] Failed to render initial HTML", error);
      try {
        initialHtmlWorker.dispose();
        rootHtml = await initialHtmlWorker.renderFromFlightData({
          flightData: initialFlightData,
          moduleMap: serverConsumerModuleMap
        });
      } catch (retryError) {
        console.error("[webframez-react] Retry for initial HTML failed", retryError);
        try {
          initialHtmlWorker.dispose();
          rootHtml = await initialHtmlWorker.renderFromFlightData({
            flightData: initialFlightData,
            moduleMap: serverConsumerModuleMap
          });
        } catch (flightRenderError) {
          console.error("[webframez-react] Flight-to-HTML render failed", flightRenderError);
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/html");
          res.end(
            createHTMLShell({
              title: "500 - Initial HTML render failed",
              headTags: "",
              clientScriptUrl: shellClientScriptUrl,
              rscEndpoint: shellRscEndpoint,
              rootHtml: createInitialHtmlErrorMarkup("Initial HTML render failed."),
              initialFlightData,
              basename: shellBasename,
              routeBasePath: shellRouteBasePath,
              liveReloadPath: liveReloadPath || void 0,
              liveReloadServerId: liveReloadPath ? devServerId : void 0
            })
          );
          return;
        }
      }
    }
    res.statusCode = resolved.statusCode;
    res.setHeader("Content-Type", "text/html");
    res.end(
      createHTMLShell({
        title: resolved.head.title || "Webframez React",
        headTags: renderHeadToString(resolved.head),
        clientScriptUrl: shellClientScriptUrl,
        rscEndpoint: shellRscEndpoint,
        rootHtml,
        initialFlightData,
        basename: shellBasename,
        routeBasePath: shellRouteBasePath,
        liveReloadPath: liveReloadPath || void 0,
        liveReloadServerId: liveReloadPath ? devServerId : void 0
      })
    );
  };
}

// src/webframez-core.ts
function normalizeMountPath(path4) {
  const trimmed = (path4 || "").trim();
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
function buildRenderDefaults(path4) {
  const mountPath = normalizeMountPath(path4);
  const routePath = mountPath === "/" ? "/*" : `${mountPath}/*`;
  if (mountPath === "/") {
    return {
      routePath,
      basePath: void 0,
      assetsPrefix: void 0,
      rscPath: void 0,
      clientScriptUrl: void 0
    };
  }
  return {
    routePath,
    basePath: mountPath,
    assetsPrefix: `${mountPath}/assets/`,
    rscPath: `${mountPath}/rsc`,
    clientScriptUrl: `${mountPath}/assets/client.js`
  };
}
async function waitForResponseFinish(res) {
  if (res.writableEnded || res.destroyed) {
    return;
  }
  await new Promise((resolve, reject) => {
    const onFinish = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
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
function normalizeMethods(method) {
  if (!method) {
    return ["GET"];
  }
  return Array.isArray(method) ? method : [method];
}
function registerByMethod(route, method, path4, component, routeOptions) {
  if (method === "GET") {
    route.get(path4, component, routeOptions);
    return;
  }
  if (method === "POST") {
    route.post(path4, component, routeOptions);
    return;
  }
  if (method === "PUT") {
    route.put(path4, component, routeOptions);
    return;
  }
  route.delete(path4, component, routeOptions);
}
function registerRouteRenderer(route, methodName) {
  route.extend(methodName, () => {
    return (path4, options) => {
      if (!options || !options.distRootDir) {
        throw new Error(
          `Route.${methodName} requires at least { distRootDir }`
        );
      }
      const defaults = buildRenderDefaults(path4);
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
        clientScriptUrl: clientScriptUrl ?? defaults.clientScriptUrl
      });
      const methods = normalizeMethods(method);
      for (const currentMethod of methods) {
        registerByMethod(
          route,
          currentMethod,
          defaults.routePath,
          async (req, res) => {
            if (!req.message || !res.res) {
              throw new Error(
                `Route.${methodName} only supports node/http requests`
              );
            }
            await handleNodeRequest(req.message, res.res);
            await waitForResponseFinish(res.res);
          },
          routeOptions
        );
      }
    };
  });
}
function initWebframezReact(route) {
  if (!route || typeof route.extend !== "function") {
    throw new Error(
      "initWebframezReact requires a webframez-core Route facade"
    );
  }
  if (typeof route.renderReact !== "function") {
    registerRouteRenderer(route, "renderReact");
  }
  if (typeof route.reactRender !== "function") {
    registerRouteRenderer(route, "reactRender");
  }
  return route;
}
var setupWebframezCoreReactRoute = initWebframezReact;
export {
  RouteChildren,
  createFileRouter,
  createHTMLShell,
  createNodeRequestHandler,
  createRSCHandler,
  initWebframezReact,
  parseSearchParams,
  renderHeadToString,
  sendRSC,
  setupWebframezCoreReactRoute
};
