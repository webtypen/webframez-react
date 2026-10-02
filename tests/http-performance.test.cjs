const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const zlib = require("node:zlib");
const { promisify } = require("node:util");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const { transformSync } = require("esbuild");

// Exercise the internal response helpers without expanding the public framework API.
const source = fs.readFileSync(path.join(__dirname, "../src/http.ts"), "utf8");
const start = source.indexOf("function isCompressibleAsset(");
const end = source.indexOf("\ntype InitialHtmlFlightPayload", start);
const helpers = vm.runInNewContext(transformSync(source.slice(start, end), { loader: "ts" }).code +
    "\n({ sendTextResponse, getPreferredContentEncoding })", {
    path, Buffer,
    compressBrotli: promisify(zlib.brotliCompress),
    compressGzip: promisify(zlib.gzip),
});

function getRaw(port, url, encoding) {
    return new Promise((resolve, reject) => {
        http.get({ hostname: "127.0.0.1", port, path: url, headers: { "Accept-Encoding": encoding } }, response => {
            const chunks = [];
            response.on("data", chunk => chunks.push(chunk));
            response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
            response.on("error", reject);
        }).on("error", reject);
    });
}

async function listen(server) {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    return server.address().port;
}

async function close(server) {
    await new Promise(resolve => server.close(resolve));
}

test("HTML compression yields the event loop and preserves body, status, cookies and cache headers", async () => {
    const body = "<main>äöü &amp; 内容</main>".repeat(12000);
    let yieldedBeforeEnd = false;
    const server = http.createServer(async (req, res) => {
        res.setHeader("Set-Cookie", "access=token; HttpOnly; SameSite=Lax");
        setImmediate(() => { if (!res.writableEnded) yieldedBeforeEnd = true; });
        await helpers.sendTextResponse(req, res, body, { statusCode: 201, contentType: "text/html; charset=utf-8", cacheControl: "no-store" });
    });
    const port = await listen(server);
    try {
        for (const [encoding, selected] of [["br, gzip", "br"], ["br;q=0, gzip", "gzip"], ["br;q=0, gzip;q=0", ""], ["br;q=0.2, gzip;q=0.8", "gzip"]]) {
            const result = await getRaw(port, "/", encoding);
            assert.equal(result.status, 201);
            assert.equal(result.headers["content-encoding"] || "", selected);
            const decoded = selected === "br" ? zlib.brotliDecompressSync(result.body) : selected === "gzip" ? zlib.gunzipSync(result.body) : result.body;
            assert.equal(decoded.toString(), body);
            assert.equal(result.headers["cache-control"], "no-store");
            assert.equal(result.headers.vary, "Accept-Encoding");
            assert.deepEqual(result.headers["set-cookie"], ["access=token; HttpOnly; SameSite=Lax"]);
        }
        assert.equal(yieldedBeforeEnd, true);
        assert.equal(helpers.getPreferredContentEncoding({ headers: { "accept-encoding": "br" } }, ".png", 2000), "");
        assert.equal(helpers.getPreferredContentEncoding({ headers: { "accept-encoding": "br" } }, ".html", 20), "");
    } finally { await close(server); }
});

test("production assets use fresh sidecars and fall back for missing or stale compressed files", async () => {
    if (!process.execArgv.includes("--conditions=react-server")) {
        const child = spawnSync(process.execPath, ["--conditions=react-server", "--test", "--test-name-pattern=production assets", __filename], {
            cwd: path.resolve(__dirname, ".."), encoding: "utf8", timeout: 15000,
        });
        assert.equal(child.status, 0, child.stdout + child.stderr);
        return;
    }
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-assets-"));
    const filename = "chunk-123456abcdef.js";
    const body = Buffer.from("console.log('asset');".repeat(300));
    const file = path.join(root, filename);
    fs.writeFileSync(file, body);
    const brotli = zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 0 } });
    const gzip = zlib.gzipSync(body, { level: 0 });
    fs.writeFileSync(file + ".br", brotli);
    fs.writeFileSync(file + ".gz", gzip);
    const oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    // react-server exports are needed only when rendering pages, not when serving assets.
    const { createNodeRequestHandler } = require("../dist/http.cjs");
    const handler = createNodeRequestHandler({ distRootDir: root, liveReloadPath: false });
    if (oldEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldEnv;
    const server = http.createServer((req, res) => handler(req, res).catch(error => { res.statusCode = 500; res.end(String(error)); }));
    const port = await listen(server);
    try {
        for (const [encoding, compressed] of [["br", brotli], ["gzip", gzip]]) {
            const result = await getRaw(port, "/assets/" + filename, encoding);
            assert.equal(result.status, 200);
            assert.deepEqual(result.body, compressed);
            assert.equal(result.headers["content-encoding"], encoding);
            assert.equal(result.headers["cache-control"], "public, max-age=31536000, immutable");
            assert.match(result.headers["content-type"], /javascript/);
        }
        fs.unlinkSync(file + ".br");
        let result = await getRaw(port, "/assets/" + filename, "br");
        assert.deepEqual(zlib.brotliDecompressSync(result.body), body);
        fs.utimesSync(file + ".gz", new Date(0), new Date(0));
        result = await getRaw(port, "/assets/" + filename, "gzip");
        assert.deepEqual(zlib.gunzipSync(result.body), body);
        assert.notDeepEqual(result.body, gzip);
        result = await getRaw(port, "/assets/" + filename, "br;q=0,gzip;q=0");
        assert.equal(result.headers["content-encoding"], undefined);
        assert.deepEqual(result.body, body);
        assert.equal((await getRaw(port, "/assets/missing.js", "br")).status, 404);
    } finally {
        await close(server);
        fs.rmSync(root, { recursive: true, force: true });
        if (oldEnv === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = oldEnv;
    }
});
