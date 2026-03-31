import path from "node:path";
import { Readable, Writable } from "node:stream";
import { createRequire } from "node:module";
import { renderToPipeableStream } from "react-server-dom-webpack/server";
import * as reactServerDomClientNode from "react-server-dom-webpack/client.node";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { ClientNavigationPayload, CreateHtmlShellOptions, SendRSCOptions } from "./types";

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
    initialFlightData = "",
    basename = "",
    routeBasePath = "",
    liveReloadPath,
    liveReloadServerId,
  } = options;

  const escapedInitialFlightData = initialFlightData
    ? JSON.stringify(initialFlightData)
        .replace(/</g, "\\u003c")
        .replace(/\u2028/g, "\\u2028")
        .replace(/\u2029/g, "\\u2029")
    : '""';

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
    <script>window.__RSC_ROUTE_BASE_PATH = "${routeBasePath}";</script>
    <script>window.__RSC_INITIAL_PAYLOAD = ${escapedInitialFlightData};</script>
    <script type="module" src="${clientScriptUrl}"></script>
    ${liveReloadScript}
  </body>
</html>`;
}

export function renderRSCToString(
  payload: ClientNavigationPayload,
  options: Pick<SendRSCOptions, "moduleMap" | "onError"> = {}
) {
  const {
    moduleMap = {},
    onError = defaultOnError,
  } = options;

  return new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    const writable = new Writable({
      write(chunk, _encoding, callback) {
        const normalized =
          typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
        chunks.push(normalized);
        callback();
      },
    });

    writable.on("finish", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    writable.on("error", reject);

    const stream = renderToPipeableStream(payload, moduleMap, { onError });
    stream.pipe(writable);
  });
}

function createReadableStreamFromString(value: string) {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(value));
      controller.close();
    },
  });
}

async function decodeFlightPayloadFromString(
  flightData: string,
  moduleMap: Record<string, unknown> = {}
) {
  const clientNode = reactServerDomClientNode as {
    createFromNodeStream?: (
      stream: NodeJS.ReadableStream,
      serverConsumerManifest: {
        moduleMap: Record<string, unknown>;
        serverModuleMap: null;
        moduleLoading: null;
      },
      options?: Record<string, unknown>
    ) => Promise<unknown> | unknown;
    createFromReadableStream?: (
      stream: ReadableStream<Uint8Array>,
      options: {
        serverConsumerManifest: {
          moduleMap: Record<string, unknown>;
          serverModuleMap: null;
          moduleLoading: null;
        };
      }
    ) => Promise<unknown> | unknown;
  };
  const serverConsumerManifest = {
    moduleMap,
    serverModuleMap: null,
    moduleLoading: null,
  };

  if (typeof clientNode.createFromNodeStream === "function") {
    return await clientNode.createFromNodeStream(
      Readable.from([flightData]),
      serverConsumerManifest,
    );
  }

  if (typeof clientNode.createFromReadableStream === "function") {
    return await clientNode.createFromReadableStream(
      createReadableStreamFromString(flightData),
      { serverConsumerManifest },
    );
  }

  throw new Error(
    "react-server-dom-webpack/client.node does not provide createFromNodeStream or createFromReadableStream.",
  );
}

export async function renderHtmlFromFlightData(
  flightData: string,
  options: Pick<SendRSCOptions, "moduleMap">
) {
  const appRequire = createRequire(path.join(process.cwd(), "__webframez_react_server__.js"));
  const target = globalThis as typeof globalThis & {
    __webpack_chunk_load__?: (id: unknown) => Promise<void>;
    __webpack_require__?: (id: unknown) => unknown;
  };
  target.__webpack_chunk_load__ = () => Promise.resolve();
  target.__webpack_require__ = (id: unknown) => {
    if (typeof id !== "string") {
      return appRequire(id as never);
    }

    if (id.startsWith("./")) {
      return appRequire(path.resolve(process.cwd(), id.slice(2)));
    }

    return appRequire(id);
  };
  const reactDomPkg = appRequire.resolve("react-dom/package.json");
  const { renderToString } = appRequire(path.join(path.dirname(reactDomPkg), "server.node.js")) as {
    renderToString: (model: unknown) => string;
  };
  const payload = await decodeFlightPayloadFromString(flightData, options.moduleMap ?? {});

  const model =
    payload && typeof payload === "object" && "model" in payload
      ? payload.model
      : payload;

  return renderToString(model);
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
