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

// src/router.ts
var router_exports = {};
__export(router_exports, {
  RouteChildren: () => RouteChildren,
  createFileRouter: () => createFileRouter,
  parseSearchParams: () => parseSearchParams,
  renderHeadToString: () => renderHeadToString
});
module.exports = __toCommonJS(router_exports);

// src/file-router.tsx
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_module = __toESM(require("node:module"), 1);
var import_node_path = __toESM(require("node:path"), 1);

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
var import_react = __toESM(require("react"), 1);
var ROUTE_CHILDREN_TAG = "webframez-route-children";
var ROUTE_CHILDREN_SENTINEL = "__webframezRouteChildren";
var ROUTE_CHILDREN_DISPLAY_NAME = "WebframezRouteChildren";
var RouteChildrenImpl = () => import_react.default.createElement(ROUTE_CHILDREN_TAG);
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
  if (!import_react.default.isValidElement(node)) {
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
    return import_react.default.cloneElement(node, void 0, ...nextChildren);
  }
  return import_react.default.cloneElement(node, void 0, nextChildren);
}

// src/file-router.tsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  if (!import_node_fs.default.existsSync(dir)) {
    return [];
  }
  const result = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    for (const entry of import_node_fs.default.readdirSync(current, { withFileTypes: true })) {
      const fullPath = import_node_path.default.join(current, entry.name);
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
  const moduleWithPrivateResolver = import_node_module.default;
  const originalResolveFilename = moduleWithPrivateResolver._resolveFilename;
  const rootParent = {
    id: "__webframez_react_runtime__",
    filename: import_node_path.default.join(process.cwd(), "__webframez_react_runtime__.js"),
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
  const relativeDir = import_node_path.default.dirname(import_node_path.default.relative(pagesDir, filePath)).replace(/\\/g, "/");
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
function resolveModule(modulePath, rootDir) {
  clearModuleCache(modulePath, rootDir);
  return require(modulePath);
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
  const layoutPath = import_node_path.default.join(pagesDir, "layout.js");
  const errorPath = import_node_path.default.join(pagesDir, "errors.js");
  const middlewaresPath = import_node_path.default.join(pagesDir, "middlewares.js");
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
    const layoutModule = import_node_fs.default.existsSync(layoutPath) ? resolveModule(layoutPath, pagesDir) : null;
    if (!import_node_fs.default.existsSync(errorPath)) {
      const fallback = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { style: { fontFamily: "system-ui, sans-serif", padding: 24 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: statusCode }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: message })
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
    if (!import_node_fs.default.existsSync(middlewaresPath)) {
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
      const layoutModule = import_node_fs.default.existsSync(layoutPath) ? resolveModule(layoutPath, pagesDir) : null;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  RouteChildren,
  createFileRouter,
  parseSearchParams,
  renderHeadToString
});
