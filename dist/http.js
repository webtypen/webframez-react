var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/http.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { execFile } from "node:child_process";

// src/server.ts
import { renderToPipeableStream } from "react-server-dom-webpack/server";
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
    basename = "",
    liveReloadPath,
    liveReloadServerId
  } = options;
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
    <script type="module" src="${clientScriptUrl}"></script>
    ${liveReloadScript}
  </body>
</html>`;
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

// src/file-router.tsx
import fs from "node:fs";
import path from "node:path";

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
      const fullPath = path.join(current, entry.name);
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
function toRouteEntry(pagesDir, filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.endsWith("/index.js")) {
    return null;
  }
  const relativeDir = path.dirname(path.relative(pagesDir, filePath)).replace(/\\/g, "/");
  const segments = relativeDir === "." ? [] : relativeDir.split("/").filter(Boolean);
  const staticCount = segments.filter((segment) => !segment.startsWith("[")).length;
  return {
    filePath,
    segments,
    staticCount
  };
}
function matchRoute(entry, pathname) {
  const targetSegments = splitSegments(pathname);
  if (entry.segments.length !== targetSegments.length) {
    return null;
  }
  const params = {};
  for (let index = 0; index < entry.segments.length; index += 1) {
    const routeSegment = entry.segments[index];
    const targetSegment = targetSegments[index];
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
  return params;
}
function mergeHead(...configs) {
  const merged = {
    meta: [],
    links: []
  };
  for (const config of configs) {
    if (!config) {
      continue;
    }
    if (config.title) {
      merged.title = config.title;
    }
    if (config.description) {
      merged.description = config.description;
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
  const tags = [];
  if (head.description) {
    tags.push(
      `<meta ${createManagedAttributes()} name="description" content="${escapeHtml(head.description)}" />`
    );
  }
  if (head.favicon) {
    tags.push(
      `<link ${createManagedAttributes()} rel="icon" href="${escapeHtml(head.favicon)}" />`
    );
  }
  for (const meta of head.meta ?? []) {
    const attrs = Object.entries(meta).filter(([, value]) => Boolean(value)).map(([key, value]) => `${key}="${escapeHtml(String(value))}"`).join(" ");
    tags.push(`<meta ${createManagedAttributes()} ${attrs} />`);
  }
  for (const link of head.links ?? []) {
    const attrs = Object.entries(link).filter(([, value]) => Boolean(value)).map(([key, value]) => `${key}="${escapeHtml(String(value))}"`).join(" ");
    tags.push(`<link ${createManagedAttributes()} ${attrs} />`);
  }
  return tags.join("\n");
}
function resolveModule(modulePath) {
  delete __require.cache[modulePath];
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
  const pagesDir = options.pagesDir;
  const layoutPath = path.join(pagesDir, "layout.js");
  const errorPath = path.join(pagesDir, "errors.js");
  function buildRouteEntries() {
    const files = walkFiles(pagesDir);
    return files.map((filePath) => toRouteEntry(pagesDir, filePath)).filter((entry) => entry !== null).sort((a, b) => {
      if (b.staticCount !== a.staticCount) {
        return b.staticCount - a.staticCount;
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
    const layoutModule = fs.existsSync(layoutPath) ? resolveModule(layoutPath) : null;
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
    const errorModule = resolveModule(errorPath);
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
  async function resolve(input) {
    const pathname = normalizePathname(input.pathname);
    const contextBase = {
      pathname,
      params: {},
      searchParams: input.searchParams,
      cookies: input.cookies ?? {},
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
      const pageModule = resolveModule(match.entry.filePath);
      const layoutModule = fs.existsSync(layoutPath) ? resolveModule(layoutPath) : null;
      const pageData = await resolvePageData(pageModule, context);
      const pageContext = {
        ...context,
        data: pageData
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
function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "";
  }
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
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
function runNodeCommand(args) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, args, { timeout: 1e4, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        const out = stderr && stderr.trim() !== "" ? stderr : stdout;
        reject(new Error(out || error.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
async function renderInitialHtmlInWorker(options) {
  const payload = Buffer.from(JSON.stringify(options), "utf8").toString("base64url");
  const script = `
const path = require("node:path");
const Module = require("node:module");
const input = JSON.parse(Buffer.from(process.argv[1], "base64url").toString("utf8"));
globalThis.__RSC_BASENAME = input.basename || "";
const appRequire = Module.createRequire(path.join(input.pagesDir, "__webframez_react_worker__.js"));
const originalResolveFilename = Module._resolveFilename;
const forcedResolutions = new Map([
  ["react", appRequire.resolve("react")],
  ["react/jsx-runtime", appRequire.resolve("react/jsx-runtime")],
  ["react/jsx-dev-runtime", appRequire.resolve("react/jsx-dev-runtime")],
  ["react-dom/client", appRequire.resolve("react-dom/client")]
]);
Module._resolveFilename = function(request, parent, isMain, options) {
  if (forcedResolutions.has(request)) {
    return forcedResolutions.get(request);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
const { createFileRouter } = require("webframez-react/router");
const reactDomPkg = require.resolve("react-dom/package.json", {
  paths: [process.cwd(), input.pagesDir]
});
const reactDomServer = require(path.join(path.dirname(reactDomPkg), "server.node.js"));

(async () => {
  const router = createFileRouter({ pagesDir: input.pagesDir });
  const resolved = await router.resolve({
    pathname: input.pathname,
    searchParams: input.searchParams || {},
    cookies: input.cookies || {},
  });
  const html = reactDomServer.renderToString(resolved.model);
  process.stdout.write(JSON.stringify({ html }));
})().catch((error) => {
  process.stderr.write(error && (error.stack || String(error)) ? (error.stack || String(error)) : "Unknown SSR worker error");
  process.exit(1);
});
`;
  const { stdout } = await runNodeCommand(["-e", script, payload]);
  const parsed = JSON.parse(stdout || "{}");
  return parsed.html || "";
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
function createNodeRequestHandler(options) {
  const devServerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const distRootDir = path2.resolve(options.distRootDir);
  const pagesDir = path2.resolve(options.pagesDir ?? path2.join(distRootDir, "pages"));
  const manifestPath = path2.resolve(
    options.manifestPath ?? path2.join(distRootDir, "react-client-manifest.json")
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
  const moduleMap = JSON.parse(fs2.readFileSync(manifestPath, "utf-8"));
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
      const search = new URLSearchParams(url.searchParams.get("search") || "");
      const resolved2 = await withRequestBasename(
        basePath,
        () => router.resolve({
          pathname,
          searchParams: parseSearchParams(search),
          cookies: requestCookies
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
      const filePath = path2.resolve(distRootDir, relative);
      if (!filePath.startsWith(distRootDir)) {
        res.statusCode = 400;
        res.end("Invalid path");
        return;
      }
      const ext = path2.extname(filePath);
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
        cookies: requestCookies
      })
    );
    let rootHtml = "";
    try {
      rootHtml = await renderInitialHtmlInWorker({
        pagesDir,
        pathname: stripBasePath(url.pathname, basePath),
        searchParams: parseSearchParams(url.searchParams),
        cookies: requestCookies,
        basename: basePath
      });
    } catch (error) {
      console.error("[webframez-react] Failed to render initial HTML", error);
    }
    res.statusCode = resolved.statusCode;
    res.setHeader("Content-Type", "text/html");
    res.end(
      createHTMLShell({
        title: resolved.head.title || "Webframez React",
        headTags: renderHeadToString(resolved.head),
        clientScriptUrl,
        rscEndpoint: rscPath,
        rootHtml,
        basename: basePath,
        liveReloadPath: liveReloadPath || void 0,
        liveReloadServerId: liveReloadPath ? devServerId : void 0
      })
    );
  };
}
export {
  createNodeRequestHandler
};
