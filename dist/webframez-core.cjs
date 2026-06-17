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

// src/webframez-core.ts
var webframez_core_exports = {};
__export(webframez_core_exports, {
  clearRegisteredReactBuildTargets: () => clearRegisteredReactBuildTargets,
  getRegisteredReactBuildTargets: () => getRegisteredReactBuildTargets,
  initWebframezReact: () => initWebframezReact,
  resolveWebframezReactRouteOptions: () => resolveWebframezReactRouteOptions,
  setupWebframezCoreReactRoute: () => setupWebframezCoreReactRoute
});
module.exports = __toCommonJS(webframez_core_exports);
var import_node_path4 = __toESM(require("node:path"), 1);

// src/http.ts
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
var import_node_url = require("node:url");
var import_node_child_process = require("node:child_process");
var import_node_zlib = require("node:zlib");

// src/server.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_node_stream = require("node:stream");
var import_node_module = require("node:module");
var import_server = require("react-server-dom-webpack/server");
var reactServerDomClientNode = __toESM(require("react-server-dom-webpack/client.node"), 1);
function defaultOnError(err) {
  console.error("[webframez-react] RSC render error", err);
}
function createHTMLShell(options = {}) {
  const {
    title = "RSC App",
    rscEndpoint = "/rsc",
    clientScriptUrl = "/client.js",
    buildId = "",
    headTags = "",
    bodyClassName = "",
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
  <body${bodyClassName ? ` class="${bodyClassName.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"` : ""}>
    <div id="root">${rootHtml}</div>
    <script>window.__RSC_ENDPOINT = "${rscEndpoint}";</script>
    <script>window.__RSC_BASENAME = "${basename}";</script>
    <script>window.__RSC_ROUTE_BASE_PATH = "${routeBasePath}";</script>
    <script>window.__WEBFRAMEZ_REACT_BUILD_ID = "${buildId}";</script>
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
    const writable = new import_node_stream.Writable({
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
    const stream = (0, import_server.renderToPipeableStream)(payload, moduleMap, { onError });
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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const stream = (0, import_server.renderToPipeableStream)(model, moduleMap, { onError });
  stream.pipe(res);
  return stream;
}

// src/file-router.tsx
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_module2 = __toESM(require("node:module"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

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
var ROUTE_CHILDREN_SLOT_SENTINEL = "__webframezRouteChildrenSlot";
var ROUTE_CHILDREN_SLOT_DISPLAY_NAME = "WebframezRouteChildrenSlot";
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
function isRouteChildrenSlotType(type) {
  if (!type || typeof type !== "function" && typeof type !== "object") {
    return false;
  }
  try {
    const candidate = type;
    return candidate[ROUTE_CHILDREN_SLOT_SENTINEL] === true || candidate.displayName === ROUTE_CHILDREN_SLOT_DISPLAY_NAME || candidate.name === "RouteChildrenSlot";
  } catch {
    return false;
  }
}
function isReactElementLike(node) {
  if (!node || typeof node !== "object") {
    return false;
  }
  try {
    return "type" in node && "props" in node;
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
  if (isReactElementLike(node) && (isRouteChildrenType(node.type) || isRouteChildrenSlotType(node.type))) {
    return routeChildren;
  }
  const isValidElement = import_react.default.isValidElement(node);
  if (!isValidElement && !isReactElementLike(node)) {
    return node;
  }
  if (isValidElement && (isRouteChildrenType(node.type) || isRouteChildrenSlotType(node.type))) {
    return routeChildren;
  }
  const props = node.props ?? {};
  if (!("children" in props)) {
    return node;
  }
  const nextChildren = injectRouteChildren(props.children, routeChildren);
  if (nextChildren === props.children) {
    return node;
  }
  if (isValidElement) {
    if (Array.isArray(nextChildren)) {
      return import_react.default.cloneElement(node, void 0, ...nextChildren);
    }
    return import_react.default.cloneElement(node, void 0, nextChildren);
  }
  const elementLike = node;
  const nextProps = {
    ...elementLike.props ?? {},
    children: nextChildren,
    ...elementLike.key !== void 0 && elementLike.key !== null ? { key: elementLike.key } : {}
  };
  return import_react.default.createElement(elementLike.type, nextProps);
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
      const fullPath = import_node_path2.default.join(current, entry.name);
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
  const moduleWithPrivateResolver = import_node_module2.default;
  const originalResolveFilename = moduleWithPrivateResolver._resolveFilename;
  const rootParent = {
    id: "__webframez_react_runtime__",
    filename: import_node_path2.default.join(process.cwd(), "__webframez_react_runtime__.js"),
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
  const relativeDir = import_node_path2.default.dirname(import_node_path2.default.relative(pagesDir, filePath)).replace(/\\/g, "/");
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
    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(config, key);
    if (config.title) {
      merged.title = config.title;
    }
    if (config.description) {
      merged.description = config.description;
    }
    if (hasOwn("bodyClassName")) {
      merged.bodyClassName = config.bodyClassName;
    }
    if (hasOwn("basename")) {
      merged.basename = config.basename;
    }
    if (hasOwn("routeBasePath")) {
      merged.routeBasePath = config.routeBasePath;
    }
    if (hasOwn("transportBasePath")) {
      merged.transportBasePath = config.transportBasePath;
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
  const layoutPath = import_node_path2.default.join(pagesDir, "layout.js");
  const errorPath = import_node_path2.default.join(pagesDir, "errors.js");
  const middlewaresPath = import_node_path2.default.join(pagesDir, "middlewares.js");
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
        },
        context: errorProps
      };
    }
    const errorModule = resolveModule(errorPath, pagesDir);
    const errorNode = await errorModule.default(errorProps);
    const layoutHead = layoutModule ? await resolveHead(layoutModule, context) : void 0;
    const errorHead = await resolveHead(errorModule, errorProps);
    const layoutNode = layoutModule ? await layoutModule.default(context) : null;
    const model = layoutNode ? injectRouteChildren(layoutNode, errorNode) : errorNode;
    const contextModel = layoutNode ? injectRouteChildren(layoutNode, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteChildren, {})) : void 0;
    return {
      statusCode,
      model,
      contextModel,
      pageModel: errorNode,
      head: mergeHead(layoutHead, errorHead),
      context: errorProps
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
      const contextModel = layoutNode ? injectRouteChildren(layoutNode, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RouteChildren, {})) : void 0;
      return {
        statusCode: 200,
        model,
        contextModel,
        pageModel: pageNode,
        head: mergeHead(layoutHead, pageHead),
        context: pageContext
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
function attachResolvedContextToCoreRequest(req, context) {
  if (!context) {
    return;
  }
  const coreRequest = req.__webframezCoreRequest;
  if (!coreRequest) {
    return;
  }
  const data = context.data && typeof context.data === "object" ? context.data : void 0;
  const env = data?.env;
  const website = data?.website;
  coreRequest.__webframezReactContext = {
    pathname: context.pathname,
    params: context.params,
    request: context.request,
    data: data ? {
      env,
      website,
      is_env_website_request: data.is_env_website_request,
      is_website_domain_request: data.is_website_domain_request,
      website_base_path: data.website_base_path,
      website_route_base_path: data.website_route_base_path,
      website_transport_base_path: data.website_transport_base_path
    } : void 0
  };
  if (!coreRequest.env && env) {
    coreRequest.env = env;
  }
  if (!coreRequest.website && website) {
    coreRequest.website = website;
  }
}
function createInitialHtmlErrorMarkup(message) {
  return `<main style="font-family:system-ui,sans-serif;padding:24px"><h1 style="margin:0 0 12px">500</h1><p style="margin:0">${message}</p></main>`;
}
function createClientAssetVersion(distRootDir) {
  try {
    const stat = import_node_fs2.default.statSync(import_node_path3.default.join(distRootDir, "client.js"));
    return `${Math.floor(stat.mtimeMs)}-${stat.size}`;
  } catch {
    return "";
  }
}
function createBuildId(distRootDir, manifestPath) {
  const clientVersion = createClientAssetVersion(distRootDir);
  try {
    const stat = import_node_fs2.default.statSync(manifestPath);
    return `${clientVersion}:${Math.floor(stat.mtimeMs)}-${stat.size}`;
  } catch {
    return clientVersion;
  }
}
function appendAssetVersion(url, version) {
  if (!version) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}
function isWithinDirectory(filePath, directory) {
  return filePath === directory || filePath.startsWith(`${directory}${import_node_path3.default.sep}`);
}
function isCompressibleAsset(ext) {
  return [".js", ".mjs", ".json", ".css", ".svg", ".txt", ".html"].includes(ext);
}
function isHashedAssetPath(filePath) {
  return /-[a-f0-9]{12,}\.[cm]?js$/i.test(import_node_path3.default.basename(filePath));
}
function setAssetContentType(res, ext) {
  if (ext === ".js" || ext === ".mjs") {
    res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  } else if (ext === ".json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  } else if (ext === ".css") {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
  } else if (ext === ".svg") {
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  }
}
function getPreferredContentEncoding(req, ext, fileSize) {
  if (!isCompressibleAsset(ext) || fileSize < 1024) {
    return "";
  }
  const acceptEncoding = String(req.headers["accept-encoding"] || "");
  if (/\bbr\b/.test(acceptEncoding)) {
    return "br";
  }
  if (/\bgzip\b/.test(acceptEncoding)) {
    return "gzip";
  }
  return "";
}
function sendTextResponse(req, res, body, options) {
  const bodyBuffer = Buffer.from(body);
  const contentEncoding = options.compress === false ? "" : getPreferredContentEncoding(req, ".html", bodyBuffer.length);
  res.statusCode = options.statusCode ?? 200;
  res.setHeader("Content-Type", options.contentType);
  if (options.cacheControl) {
    res.setHeader("Cache-Control", options.cacheControl);
  }
  res.setHeader("Vary", "Accept-Encoding");
  if (contentEncoding === "br") {
    res.setHeader("Content-Encoding", "br");
    res.end((0, import_node_zlib.brotliCompressSync)(bodyBuffer));
    return;
  }
  if (contentEncoding === "gzip") {
    res.setHeader("Content-Encoding", "gzip");
    res.end((0, import_node_zlib.gzipSync)(bodyBuffer));
    return;
  }
  res.end(bodyBuffer);
}
var INITIAL_HTML_WORKER_SCRIPT = `
const fs = require("node:fs");
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
function normalizeWebframezRequireCandidate(candidate) {
  const stagingMarker = path.join(".webframez-build", "");
  const runtimeMarkers = [path.join("app", ""), path.join("modules", "")];
  const stagingIndex = candidate.indexOf(stagingMarker);
  if (stagingIndex >= 0) {
    for (const runtimeMarker of runtimeMarkers) {
      const markerIndex = candidate.indexOf(runtimeMarker, stagingIndex);
      if (markerIndex < 0) {
        continue;
      }

      const relativeRuntimePath = candidate.slice(markerIndex);
      const runtimeCandidates = [
        path.resolve(process.cwd(), relativeRuntimePath),
        path.resolve(process.cwd(), "build", relativeRuntimePath)
      ];
      const cwdParts = process.cwd().split(path.sep);
      const buildsIndex = cwdParts.lastIndexOf("builds");
      if (buildsIndex > 0) {
        const projectRoot = cwdParts.slice(0, buildsIndex).join(path.sep) || path.sep;
        runtimeCandidates.push(path.resolve(projectRoot, "build", relativeRuntimePath));
      }

      const runtimeCandidate = runtimeCandidates.find((candidatePath) => fs.existsSync(candidatePath));
      if (runtimeCandidate) {
        return runtimeCandidate;
      }
    }
  }

  const frameworkDistDir = path.join("node_modules", "@webtypen", "webframez-react", "dist");
  const shouldUseCjs =
    candidate.includes(frameworkDistDir) &&
    (candidate.endsWith(path.join("dist", "navigation.js")) ||
      candidate.endsWith(path.join("dist", "route-slot.js")));

  if (!shouldUseCjs) {
    return candidate;
  }

  const cjsCandidate = candidate.slice(0, -3) + ".cjs";
  return fs.existsSync(cjsCandidate) ? cjsCandidate : candidate;
}

globalThis.__webpack_require__ = function __webframezNodeRequire(id) {
  if (typeof id !== "string") {
    return require(id);
  }

  const directRequireTarget = normalizeWebframezRequireCandidate(id);
  if (directRequireTarget !== id) {
    return require(directRequireTarget);
  }

  if (id.startsWith("./")) {
    const relativeId = id.slice(2);
    const candidates = [
      path.resolve(process.cwd(), relativeId),
      path.resolve(process.cwd(), "..", relativeId)
    ];
    for (const candidate of candidates) {
      const requireTarget = normalizeWebframezRequireCandidate(candidate);
      try {
        return require(requireTarget);
      } catch (error) {
        const missingCandidate =
          error &&
          error.code === "MODULE_NOT_FOUND" &&
          typeof error.message === "string" &&
          (error.message.includes("'" + candidate + "'") ||
            error.message.includes("'" + requireTarget + "'"));
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
      Readable.from([Buffer.from(flightData)]),
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

  const basename =
    payload &&
    typeof payload === "object" &&
    payload.head &&
    typeof payload.head.basename === "string"
      ? payload.head.basename
      : "";

  const previousBasename = globalThis.__RSC_BASENAME;
  globalThis.__RSC_BASENAME = basename;
  try {
    return await renderHtml(model);
  } finally {
    globalThis.__RSC_BASENAME = previousBasename;
  }
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
function joinRuntimeAssetPath(basePath, pathname) {
  const normalizedBasePath = normalizeRuntimeBasePath(basePath) ?? "";
  const normalizedPath = !pathname || pathname === "/" ? "/" : pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalizedBasePath && (normalizedPath === normalizedBasePath || normalizedPath.startsWith(`${normalizedBasePath}/`))) {
    return normalizedPath;
  }
  return joinRuntimeBasePath(normalizedBasePath, normalizedPath);
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
    child = (0, import_node_child_process.spawn)(process.execPath, ["-e", INITIAL_HTML_WORKER_SCRIPT], {
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
    import_node_path3.default.resolve(options.cwd, "node_modules"),
    import_node_path3.default.resolve(options.distRootDir, "..", "..", "node_modules")
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
      absolutePath = (0, import_node_url.fileURLToPath)(key);
    } catch {
      continue;
    }
    const marker = `${import_node_path3.default.sep}node_modules${import_node_path3.default.sep}`;
    const markerIndex = absolutePath.lastIndexOf(marker);
    if (markerIndex < 0) {
      continue;
    }
    const relativeModulePath = absolutePath.slice(markerIndex + marker.length);
    const relativeModulePathPosix = relativeModulePath.split(import_node_path3.default.sep).join("/");
    addAlias(`./node_modules/${relativeModulePathPosix}`, value);
    addAlias(`node_modules/${relativeModulePathPosix}`, value);
    addAlias(absolutePath, value);
    for (const nodeModulesDir of candidateNodeModulesDirs) {
      const aliasPath = import_node_path3.default.join(nodeModulesDir, relativeModulePath);
      addAlias(aliasPath, value);
      addAlias((0, import_node_url.pathToFileURL)(aliasPath).href, value);
    }
  }
  return normalized;
}
function createServerConsumerManifest(manifest) {
  const consumerManifest = {};
  const normalizeWorkerModuleId = (requestKey, rawModuleId) => {
    if (typeof rawModuleId === "string" && rawModuleId.trim() !== "") {
      const isStagingModuleId = rawModuleId.startsWith("./.webframez-build/") || rawModuleId.includes(`${import_node_path3.default.sep}.webframez-build${import_node_path3.default.sep}`);
      const isRuntimeBuildKey = requestKey.startsWith("file://") || requestKey.startsWith("/") && requestKey.includes(`${import_node_path3.default.sep}build${import_node_path3.default.sep}app${import_node_path3.default.sep}`);
      if (isStagingModuleId && isRuntimeBuildKey) {
        if (requestKey.startsWith("file://")) {
          try {
            return (0, import_node_url.fileURLToPath)(requestKey);
          } catch {
            return rawModuleId;
          }
        }
        return requestKey;
      }
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
        return (0, import_node_url.fileURLToPath)(requestKey);
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
  const addReference = (lookupKey, exportName, reference) => {
    if (!lookupKey || lookupKey.trim() === "") {
      return;
    }
    const normalizedExportName = exportName || "*";
    consumerManifest[lookupKey] ??= {};
    if (normalizedExportName in consumerManifest[lookupKey]) {
      return;
    }
    consumerManifest[lookupKey][normalizedExportName] = reference;
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
    const hashIndex = key.lastIndexOf("#");
    const keyWithoutExport = hashIndex > -1 ? key.slice(0, hashIndex) : key;
    const keyExportName = hashIndex > -1 ? key.slice(hashIndex + 1) : "";
    const manifestExportName = typeof entry.name === "string" && entry.name !== "*" ? entry.name : "";
    const exportNames = new Set(
      [keyExportName, manifestExportName].filter((name) => name.trim() !== "")
    );
    addReference(
      key,
      "*",
      keyExportName ? { ...reference, name: keyExportName } : reference
    );
    addReference(keyWithoutExport, "*", reference);
    for (const exportName of exportNames) {
      const exportReference = {
        ...reference,
        name: exportName
      };
      addReference(keyWithoutExport, exportName, exportReference);
      addReference(key, "*", exportReference);
    }
    if (typeof entry.id === "number" && Number.isFinite(entry.id)) {
      addReference(String(entry.id), "*", reference);
      for (const exportName of exportNames) {
        addReference(String(entry.id), exportName, {
          ...reference,
          name: exportName
        });
      }
    } else if (typeof entry.id === "string" && entry.id.trim() !== "") {
      addReference(entry.id, "*", reference);
      for (const exportName of exportNames) {
        addReference(entry.id, exportName, {
          ...reference,
          name: exportName
        });
      }
    }
  }
  return consumerManifest;
}
function createManifestLoader(options) {
  let cache = null;
  return () => {
    const stat = import_node_fs2.default.statSync(options.manifestPath);
    const cacheKey = `${Math.floor(stat.mtimeMs)}-${stat.size}`;
    if (cache && cache.cacheKey === cacheKey) {
      return cache;
    }
    const moduleMap = normalizeClientManifest(
      JSON.parse(import_node_fs2.default.readFileSync(options.manifestPath, "utf-8")),
      {
        distRootDir: options.distRootDir,
        cwd: options.cwd
      }
    );
    cache = {
      cacheKey,
      buildId: createBuildId(options.distRootDir, options.manifestPath),
      moduleMap,
      serverConsumerModuleMap: createServerConsumerManifest(moduleMap)
    };
    return cache;
  };
}
function createNodeRequestHandler(options) {
  const devServerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const distRootDir = import_node_path3.default.resolve(options.distRootDir);
  const pagesDir = import_node_path3.default.resolve(options.pagesDir ?? import_node_path3.default.join(distRootDir, "pages"));
  const manifestPath = import_node_path3.default.resolve(
    options.manifestPath ?? import_node_path3.default.join(distRootDir, "react-client-manifest.json")
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
  const getManifestState = createManifestLoader({
    distRootDir,
    manifestPath,
    cwd: process.cwd()
  });
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
      const manifestState2 = getManifestState();
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
      attachResolvedContextToCoreRequest(req, resolved2.context);
      const payload = {
        model: resolved2.model,
        contextModel: resolved2.contextModel,
        pageModel: resolved2.pageModel,
        head: resolved2.head
      };
      res.setHeader("X-Webframez-React-Build", manifestState2.buildId);
      sendRSC(res, payload, {
        moduleMap: manifestState2.moduleMap,
        statusCode: resolved2.statusCode
      });
      return;
    }
    if (url.pathname.startsWith(assetsPrefix)) {
      const relative = url.pathname.slice(assetsPrefix.length);
      const filePath = import_node_path3.default.resolve(distRootDir, relative);
      if (!isWithinDirectory(filePath, distRootDir)) {
        res.statusCode = 400;
        res.end("Invalid path");
        return;
      }
      const ext = import_node_path3.default.extname(filePath);
      let stat;
      try {
        stat = import_node_fs2.default.statSync(filePath);
        if (!stat.isFile()) {
          throw new Error("Asset path is not a file");
        }
      } catch {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }
      setAssetContentType(res, ext);
      const isDevelopmentAsset = nodeEnv !== "production";
      const isVersionedClientAsset = import_node_path3.default.basename(filePath) === "client.js" && url.searchParams.has("v");
      const canCacheLongTerm = !isDevelopmentAsset && (isHashedAssetPath(filePath) || isVersionedClientAsset);
      res.setHeader(
        "Cache-Control",
        canCacheLongTerm ? "public, max-age=31536000, immutable" : "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Vary", "Accept-Encoding");
      const contentEncoding = !isDevelopmentAsset ? getPreferredContentEncoding(req, ext, stat.size) : "";
      const stream = import_node_fs2.default.createReadStream(filePath);
      stream.on("error", () => {
        if (!res.headersSent) {
          res.statusCode = 404;
        }
        res.end("Not found");
      });
      if (contentEncoding === "br") {
        res.setHeader("Content-Encoding", "br");
        stream.pipe((0, import_node_zlib.createBrotliCompress)()).pipe(res);
      } else if (contentEncoding === "gzip") {
        res.setHeader("Content-Encoding", "gzip");
        stream.pipe((0, import_node_zlib.createGzip)()).pipe(res);
      } else {
        stream.pipe(res);
      }
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
    attachResolvedContextToCoreRequest(req, resolved.context);
    const initialPayload = {
      model: resolved.model,
      head: resolved.head
    };
    const manifestState = getManifestState();
    const initialFlightData = await renderRSCToString(initialPayload, {
      moduleMap: manifestState.moduleMap
    });
    const transportBasePath = normalizeRuntimeBasePath(resolved.head.transportBasePath) ?? normalizeRuntimeBasePath(basePath) ?? "";
    const shellClientScriptUrl = appendAssetVersion(
      joinRuntimeAssetPath(
        transportBasePath,
        clientScriptUrl
      ),
      createClientAssetVersion(distRootDir)
    );
    const shellRscEndpoint = joinRuntimeBasePath(transportBasePath, "/rsc");
    const shellBasename = normalizeRuntimeBasePath(resolved.head.basename) ?? normalizeRuntimeBasePath(basePath) ?? "";
    const shellRouteBasePath = normalizeRuntimeBasePath(resolved.head.routeBasePath) ?? "";
    let rootHtml;
    try {
      rootHtml = await initialHtmlWorker.renderFromFlightData({
        flightData: initialFlightData,
        moduleMap: manifestState.serverConsumerModuleMap
      });
    } catch (error) {
      console.error("[webframez-react] Failed to render initial HTML", error);
      try {
        initialHtmlWorker.dispose();
        rootHtml = await initialHtmlWorker.renderFromFlightData({
          flightData: initialFlightData,
          moduleMap: manifestState.serverConsumerModuleMap
        });
      } catch (retryError) {
        console.error("[webframez-react] Retry for initial HTML failed", retryError);
        try {
          initialHtmlWorker.dispose();
          rootHtml = await initialHtmlWorker.renderFromFlightData({
            flightData: initialFlightData,
            moduleMap: manifestState.serverConsumerModuleMap
          });
        } catch (flightRenderError) {
          console.error("[webframez-react] Flight-to-HTML render failed", flightRenderError);
          sendTextResponse(
            req,
            res,
            createInitialHtmlErrorMarkup("Failed to render initial React HTML."),
            {
              statusCode: 500,
              contentType: "text/html; charset=utf-8",
              compress: nodeEnv === "production"
            }
          );
          return;
        }
      }
    }
    sendTextResponse(
      req,
      res,
      createHTMLShell({
        title: resolved.head.title || "Webframez React",
        headTags: renderHeadToString(resolved.head),
        bodyClassName: resolved.head.bodyClassName || "",
        clientScriptUrl: shellClientScriptUrl,
        buildId: manifestState.buildId,
        rscEndpoint: shellRscEndpoint,
        rootHtml,
        initialFlightData,
        basename: shellBasename,
        routeBasePath: shellRouteBasePath,
        liveReloadPath: liveReloadPath || void 0,
        liveReloadServerId: liveReloadPath ? devServerId : void 0
      }),
      {
        statusCode: resolved.statusCode,
        contentType: "text/html; charset=utf-8",
        cacheControl: "no-store, no-cache, must-revalidate, proxy-revalidate",
        compress: nodeEnv === "production"
      }
    );
  };
}

// src/webframez-core.ts
function normalizeMountPath(path5) {
  const trimmed = (path5 || "").trim();
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
var REGISTRY_KEY = "__WEBFRAMEZ_REACT_BUILD_TARGETS__";
function getBuildTargetsRegistry() {
  const globalWithRegistry = globalThis;
  if (!globalWithRegistry[REGISTRY_KEY]) {
    globalWithRegistry[REGISTRY_KEY] = [];
  }
  return globalWithRegistry[REGISTRY_KEY];
}
function toRouteKey(mountPath) {
  const trimmed = mountPath.replace(/^\/+|\/+$/g, "");
  return trimmed || "root";
}
function toPascalCase(value) {
  return value.split(/[^A-Za-z0-9]+/).filter(Boolean).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join("");
}
function getOutputRoot() {
  const configured = process.env.WEBFRAMEZ_REACT_OUT_DIR;
  if (configured) {
    return import_node_path4.default.resolve(process.cwd(), configured);
  }
  const isTsNodeRuntime = process.execArgv.some((arg) => arg.includes("ts-node/register")) || process.env.TS_NODE_FILES === "true" || typeof require !== "undefined" && typeof require.extensions[".ts"] === "function";
  if (isTsNodeRuntime && import_node_path4.default.basename(process.cwd()) !== "build") {
    return import_node_path4.default.resolve(process.cwd(), "build");
  }
  return process.cwd();
}
function resolveFromProjectRoot(value) {
  return import_node_path4.default.resolve(process.cwd(), value);
}
function resolveFromOutputRoot(value) {
  return import_node_path4.default.resolve(getOutputRoot(), value);
}
function buildRenderDefaults(routePathValue) {
  const mountPath = normalizeMountPath(routePathValue);
  const routeKey = toRouteKey(mountPath);
  const routeDirName = toPascalCase(routeKey) || routeKey;
  const routePath = mountPath === "/" ? "/*" : `${mountPath}/*`;
  const srcPath = import_node_path4.default.join("app", routeDirName, "react");
  const pagesDir = srcPath;
  const distRootDir = import_node_path4.default.join("webframez-react", routeKey);
  const styleSrcPath = import_node_path4.default.join("app", routeDirName, "assets", "scss");
  if (mountPath === "/") {
    return {
      path: mountPath,
      routePath,
      routeKey,
      srcPath: resolveFromProjectRoot(srcPath),
      distRootDir: resolveFromOutputRoot(distRootDir),
      pagesDir: resolveFromOutputRoot(pagesDir),
      manifestPath: resolveFromOutputRoot(import_node_path4.default.join(distRootDir, "react-client-manifest.json")),
      styleSrcPath: resolveFromProjectRoot(styleSrcPath),
      basePath: void 0,
      assetsPrefix: void 0,
      rscPath: void 0,
      clientScriptUrl: void 0
    };
  }
  return {
    path: mountPath,
    routePath,
    routeKey,
    srcPath: resolveFromProjectRoot(srcPath),
    distRootDir: resolveFromOutputRoot(distRootDir),
    pagesDir: resolveFromOutputRoot(pagesDir),
    manifestPath: resolveFromOutputRoot(import_node_path4.default.join(distRootDir, "react-client-manifest.json")),
    styleSrcPath: resolveFromProjectRoot(styleSrcPath),
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
function registerByMethod(route, method, path5, component, routeOptions) {
  if (method === "GET") {
    route.get(path5, component, routeOptions);
    return;
  }
  if (method === "POST") {
    route.post(path5, component, routeOptions);
    return;
  }
  if (method === "PUT") {
    route.put(path5, component, routeOptions);
    return;
  }
  route.delete(path5, component, routeOptions);
}
function registerRouteRenderer(route, methodName) {
  route.extend(methodName, () => {
    return (routePathValue, options = {}) => {
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
      const resolvedManifestPath = manifestPath ?? import_node_path4.default.join(resolvedDistRootDir, "react-client-manifest.json");
      const resolvedTarget = {
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
        clientEntryPath: clientEntryPath ? resolveFromProjectRoot(clientEntryPath) : void 0,
        styleSrcPath: styleSrcPath ? resolveFromProjectRoot(styleSrcPath) : defaults.styleSrcPath
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
            const message = req.message;
            message.__webframezCoreRequest = req;
            try {
              await handleNodeRequest(message, res.res);
            } finally {
              delete message.__webframezCoreRequest;
            }
            await waitForResponseFinish(res.res);
          },
          routeOptions
        );
      }
    };
  });
}
function resolveWebframezReactRouteOptions(routePathValue, options = {}) {
  const defaults = buildRenderDefaults(routePathValue);
  const distRootDir = options.distRootDir ?? defaults.distRootDir;
  const pagesDir = options.pagesDir ?? defaults.pagesDir;
  const manifestPath = options.manifestPath ?? import_node_path4.default.join(distRootDir, "react-client-manifest.json");
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
    clientEntryPath: options.clientEntryPath ? resolveFromProjectRoot(options.clientEntryPath) : void 0,
    styleSrcPath: options.styleSrcPath ? resolveFromProjectRoot(options.styleSrcPath) : defaults.styleSrcPath,
    basePath: options.basePath ?? defaults.basePath,
    liveReloadPath: options.liveReloadPath
  };
}
function getRegisteredReactBuildTargets() {
  return [...getBuildTargetsRegistry()];
}
function clearRegisteredReactBuildTargets() {
  getBuildTargetsRegistry().length = 0;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  clearRegisteredReactBuildTargets,
  getRegisteredReactBuildTargets,
  initWebframezReact,
  resolveWebframezReactRouteOptions,
  setupWebframezCoreReactRoute
});
