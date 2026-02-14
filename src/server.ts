import { renderToPipeableStream } from "react-server-dom-webpack/server";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreateHtmlShellOptions, SendRSCOptions } from "./types";

function defaultOnError(err: unknown) {
  console.error("[webframez-react] RSC render error", err);
}

export function createHTMLShell(options: CreateHtmlShellOptions = {}) {
  const {
    title = "RSC App",
    rscEndpoint = "/rsc",
    clientScriptUrl = "/client.js",
    headTags = "",
    rootHtml = "",
    basename = "",
    liveReloadPath,
    liveReloadServerId,
  } = options;

  const liveReloadScript =
    liveReloadPath && liveReloadServerId
      ? `<script>
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
</script>`
      : "";

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

export function sendRSC(
  res: ServerResponse,
  model: unknown,
  options: SendRSCOptions = {}
) {
  const {
    moduleMap = {},
    onError = defaultOnError,
    statusCode = 200,
    contentType = "text/x-component",
  } = options;

  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);

  const stream = renderToPipeableStream(model, moduleMap, { onError });
  stream.pipe(res);

  return stream;
}

export function createRSCHandler(options: {
  rscPath?: string;
  getModel: (req: IncomingMessage) => Promise<unknown> | unknown;
  moduleMap?: Record<string, unknown>;
  onError?: (error: unknown) => void;
}): (req: IncomingMessage, res: ServerResponse) => Promise<boolean> {
  const {
    rscPath = "/rsc",
    getModel,
    moduleMap = {},
    onError = defaultOnError,
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
