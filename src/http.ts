import fs from "node:fs";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHTMLShell, sendRSC } from "./server";
import { createFileRouter, parseSearchParams, renderHeadToString } from "./router";
import type { ClientNavigationPayload } from "./types";

export type WebframezReactRoutePath = `/${string}` | "/";
export type WebframezReactAssetsPrefix = `${WebframezReactRoutePath}/` | "/";

export interface CreateNodeHandlerPathsOptions {
  distRootDir: string;
  pagesDir?: string;
  manifestPath?: string;
}

export interface CreateNodeHandlerRoutingOptions {
  assetsPrefix?: WebframezReactAssetsPrefix;
  rscPath?: WebframezReactRoutePath;
  clientScriptUrl?: WebframezReactRoutePath;
  basePath?: WebframezReactRoutePath;
  liveReloadPath?: WebframezReactRoutePath | false;
}

export interface CreateNodeHandlerOptions
  extends CreateNodeHandlerPathsOptions,
    CreateNodeHandlerRoutingOptions {
}

function createInitialHtmlErrorMarkup(message: string) {
  return `<main style="font-family:system-ui,sans-serif;padding:24px"><h1 style="margin:0 0 12px">500</h1><p style="margin:0">${message}</p></main>`;
}

type InitialHtmlRenderPayload = {
  pathname: string;
  searchParams: Record<string, string | string[]>;
  cookies: Record<string, string>;
  basename?: string;
};

type InitialHtmlWorkerRequest = {
  id: number;
  type: "render";
  payload: InitialHtmlRenderPayload;
};

type InitialHtmlWorkerResponse =
  | {
      id: number;
      ok: true;
      html: string;
    }
  | {
      id: number;
      ok: false;
      error: string;
    };

const INITIAL_HTML_WORKER_SCRIPT = `
const path = require("node:path");
const Module = require("node:module");

const pagesDir = process.env.WEBFRAMEZ_REACT_PAGES_DIR || "";
if (!pagesDir) {
  throw new Error("Missing WEBFRAMEZ_REACT_PAGES_DIR");
}

const appRequire = Module.createRequire(path.join(pagesDir, "__webframez_react_worker__.js"));
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

const { createFileRouter } = require("@webtypen/webframez-react/router");
const reactDomPkg = require.resolve("react-dom/package.json", {
  paths: [process.cwd(), pagesDir]
});
const reactDomServer = require(path.join(path.dirname(reactDomPkg), "server.node.js"));
const router = createFileRouter({ pagesDir });

process.on("message", async (message) => {
  if (!message || message.type !== "render") {
    return;
  }

  const previousBasename = globalThis.__RSC_BASENAME;
  globalThis.__RSC_BASENAME = message.payload.basename || "";

  try {
    const resolved = await router.resolve({
      pathname: message.payload.pathname,
      searchParams: message.payload.searchParams || {},
      cookies: message.payload.cookies || {},
    });
    const html = reactDomServer.renderToString(resolved.model);
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
  } finally {
    globalThis.__RSC_BASENAME = previousBasename;
  }
});
`;

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath === "/") {
    return "";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

function stripBasePath(pathname: string, basePath: string) {
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

function sanitizeInitialHtmlWorkerNodeOptions(rawNodeOptions?: string) {
  if (!rawNodeOptions || rawNodeOptions.trim() === "") {
    return "";
  }

  return rawNodeOptions
    .replace(/(^|\s)--conditions\s+react-server(?=\s|$)/g, " ")
    .replace(/(^|\s)-r\s+(\S*webframez-react\/register)(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createInitialHtmlWorker(pagesDir: string) {
  let child: ChildProcess | null = null;
  let nextRequestId = 1;
  let stderrBuffer = "";
  const pending = new Map<
    number,
    {
      resolve: (html: string) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  const rejectPending = (error: Error) => {
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
        NODE_OPTIONS: sanitizeInitialHtmlWorkerNodeOptions(process.env.NODE_OPTIONS),
        WEBFRAMEZ_REACT_PAGES_DIR: pagesDir,
      },
      stdio: ["ignore", "ignore", "pipe", "ipc"],
    });

    child.on("message", (message: InitialHtmlWorkerResponse) => {
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
      stderrBuffer = `${stderrBuffer}${chunk.toString("utf8")}`.slice(-8_192);
    });

    child.on("exit", (code, signal) => {
      const suffix = stderrBuffer.trim() !== ""
        ? `\n${stderrBuffer.trim()}`
        : "";
      rejectPending(
        new Error(
          `[webframez-react] Initial HTML worker exited (${signal ?? code ?? "unknown"})${suffix}`,
        ),
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
    render(payload: InitialHtmlRenderPayload) {
      const activeChild = startWorker();
      const requestId = nextRequestId++;

      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          rejectPending(new Error("[webframez-react] Initial HTML worker timed out"));
          stopWorker();
        }, 10_000);

        pending.set(requestId, { resolve, reject, timeout });

        const request: InitialHtmlWorkerRequest = {
          id: requestId,
          type: "render",
          payload,
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
    },
  };
}

function withRequestBasename<T>(basename: string, fn: () => Promise<T> | T) {
  const target = globalThis as { __RSC_BASENAME?: string };
  const previous = target.__RSC_BASENAME;
  target.__RSC_BASENAME = basename;

  const finish = () => {
    target.__RSC_BASENAME = previous;
  };

  try {
    const result = fn();
    if (result && typeof (result as Promise<T>).then === "function") {
      return (result as Promise<T>).finally(finish);
    }
    finish();
    return result;
  } catch (error) {
    finish();
    throw error;
  }
}

function parseCookies(rawCookieHeader?: string | string[]) {
  const raw = Array.isArray(rawCookieHeader)
    ? rawCookieHeader.join("; ")
    : rawCookieHeader ?? "";
  const output: Record<string, string> = {};

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

export function createNodeRequestHandler(options: CreateNodeHandlerOptions) {
  const devServerId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const distRootDir = path.resolve(options.distRootDir);
  const pagesDir = path.resolve(options.pagesDir ?? path.join(distRootDir, "pages"));
  const manifestPath = path.resolve(
    options.manifestPath ?? path.join(distRootDir, "react-client-manifest.json")
  );
  const assetsPrefix = options.assetsPrefix ?? "/assets/";
  const rscPath = options.rscPath ?? "/rsc";
  const clientScriptUrl = options.clientScriptUrl ?? "/assets/client.js";
  const basePath = normalizeBasePath(options.basePath);
  const nodeEnv = process.env.NODE_ENV || "";
  const runningInWatchMode = Array.isArray(process.execArgv) && process.execArgv.includes("--watch");
  const liveReloadEnabled =
    options.liveReloadPath !== false && (nodeEnv === "development" || runningInWatchMode);
  const liveReloadPath =
    !liveReloadEnabled
      ? ""
      : options.liveReloadPath ?? `${basePath || ""}/__webframez_live_reload`;
  const liveReloadClients = new Set<ServerResponse>();

  const router = createFileRouter({ pagesDir });
  const moduleMap = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const initialHtmlWorker = createInitialHtmlWorker(pagesDir);
  const disposeInitialHtmlWorker = () => {
    initialHtmlWorker.dispose();
  };

  process.once("exit", disposeInitialHtmlWorker);
  process.once("SIGINT", disposeInitialHtmlWorker);
  process.once("SIGTERM", disposeInitialHtmlWorker);

  return async function handleRequest(req: IncomingMessage, res: ServerResponse) {
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

        res.write(`retry: 400\n`);
        res.write(`data: ${JSON.stringify({ serverId: devServerId })}\n\n`);

        liveReloadClients.add(res);
        const heartbeat = setInterval(() => {
          if (!res.writableEnded && !res.destroyed) {
            res.write(`: ping\n\n`);
          }
        }, 15_000);

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
      const resolved = await withRequestBasename(basePath, () =>
        router.resolve({
          pathname,
          searchParams: parseSearchParams(search),
          cookies: requestCookies,
        })
      );

      const payload: ClientNavigationPayload = {
        model: resolved.model,
        head: resolved.head,
      };
      sendRSC(res, payload, {
        moduleMap,
        statusCode: resolved.statusCode,
      });
      return;
    }

    if (url.pathname.startsWith(assetsPrefix)) {
      const relative = url.pathname.slice(assetsPrefix.length);
      const filePath = path.resolve(distRootDir, relative);
      if (!filePath.startsWith(distRootDir)) {
        res.statusCode = 400;
        res.end("Invalid path");
        return;
      }

      const ext = path.extname(filePath);
      if (ext === ".js" || ext === ".mjs") {
        res.setHeader("Content-Type", "text/javascript; charset=utf-8");
      } else if (ext === ".json") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }

      const stream = fs.createReadStream(filePath);
      stream.on("error", () => {
        res.statusCode = 404;
        res.end("Not found");
      });
      stream.pipe(res);
      return;
    }

    const resolved = await withRequestBasename(basePath, () =>
      router.resolve({
        pathname: stripBasePath(url.pathname, basePath),
        searchParams: parseSearchParams(url.searchParams),
        cookies: requestCookies,
      })
    );
    let rootHtml = "";
    try {
      rootHtml = await initialHtmlWorker.render({
        pathname: stripBasePath(url.pathname, basePath),
        searchParams: parseSearchParams(url.searchParams),
        cookies: requestCookies,
        basename: basePath,
      });
    } catch (error) {
      console.error("[webframez-react] Failed to render initial HTML", error);
      try {
        initialHtmlWorker.dispose();
        rootHtml = await initialHtmlWorker.render({
          pathname: stripBasePath(url.pathname, basePath),
          searchParams: parseSearchParams(url.searchParams),
          cookies: requestCookies,
          basename: basePath,
        });
      } catch (retryError) {
        console.error("[webframez-react] Retry for initial HTML failed", retryError);
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/html");
        res.end(
          createHTMLShell({
            title: "500 - Initial HTML render failed",
            headTags: "",
            clientScriptUrl,
            rscEndpoint: rscPath,
            rootHtml: createInitialHtmlErrorMarkup("Initial HTML render failed."),
            basename: basePath,
            liveReloadPath: liveReloadPath || undefined,
            liveReloadServerId: liveReloadPath ? devServerId : undefined,
          }),
        );
        return;
      }
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
        liveReloadPath: liveReloadPath || undefined,
        liveReloadServerId: liveReloadPath ? devServerId : undefined,
      })
    );
  };
}
