import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createHTMLShell, sendRSC } from "./server";
import { createFileRouter, parseSearchParams, renderHeadToString } from "./router";

export type CreateNodeHandlerOptions = {
  distRootDir: string;
  pagesDir?: string;
  manifestPath?: string;
  assetsPrefix?: string;
  rscPath?: string;
  clientScriptUrl?: string;
  basePath?: string;
  liveReloadPath?: string | false;
};

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

function runNodeCommand(args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(process.execPath, args, { timeout: 10_000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
      if (error) {
        const out = stderr && stderr.trim() !== "" ? stderr : stdout;
        reject(new Error(out || error.message));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function renderInitialHtmlInWorker(options: {
  pagesDir: string;
  pathname: string;
  searchParams: Record<string, string | string[]>;
  cookies: Record<string, string>;
  basename?: string;
}) {
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
  const parsed = JSON.parse(stdout || "{}") as { html?: string };
  return parsed.html || "";
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

      sendRSC(res, resolved.model, {
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
      rootHtml = await renderInitialHtmlInWorker({
        pagesDir,
        pathname: stripBasePath(url.pathname, basePath),
        searchParams: parseSearchParams(url.searchParams),
        cookies: requestCookies,
        basename: basePath,
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
        liveReloadPath: liveReloadPath || undefined,
        liveReloadServerId: liveReloadPath ? devServerId : undefined,
      })
    );
  };
}
