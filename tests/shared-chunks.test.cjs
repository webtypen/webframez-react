const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");
const { randomBytes } = require("node:crypto");
const webpack = require("webpack");

test("Flight references load shared chunks once, preserve shared state and ship valid compressed assets", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-chunks-"));
  const pages = path.join(root, "pages");
  const out = path.join(root, "dist");
  const previousCwd = process.cwd();
  const previousEnv = { ...process.env };
  const configFile = require.resolve("../defaults/webpack.client.cjs");
  let compiler;
  try {
    fs.mkdirSync(pages);
    fs.writeFileSync(path.join(root, "package.json"), '{"private":true}');
    fs.symlinkSync(path.resolve(__dirname, "../node_modules"), path.join(root, "node_modules"), "dir");
    fs.writeFileSync(path.join(root, "shared.js"), `export const data = "${randomBytes(30000).toString("hex")}"; let count = 0; export const increment = () => ++count; export const read = () => count;`);
    fs.writeFileSync(path.join(pages, "A.js"), '"use client"; export { data, increment } from "../shared.js";');
    fs.writeFileSync(path.join(pages, "B.js"), '"use client"; export { data, read } from "../shared.js";');
    fs.writeFileSync(path.join(root, "entry.js"), `
      import "react-server-dom-webpack/client";
      globalThis.loadReference = async ({id, chunks}) => {
        await Promise.all(chunks.filter((_, index) => index % 2 === 0).map(id => __webpack_require__.e(id)));
        return __webpack_require__(id);
      };
    `);
    process.chdir(root);
    Object.assign(process.env, { NODE_ENV: "production", WEBFRAMEZ_REACT_PAGES_DIR: pages, WEBFRAMEZ_REACT_DIST_ROOT_DIR: out, WEBFRAMEZ_REACT_CLIENT_ENTRY: path.join(root, "entry.js") });
    delete require.cache[configFile];
    const config = require(configFile);
    compiler = webpack({ ...config, cache: false, module: { rules: [] } });
    const stats = await new Promise((resolve, reject) => compiler.run((error, stats) => error ? reject(error) : resolve(stats)));
    assert.equal(stats.hasErrors(), false, stats.toString({ all: false, errors: true }));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, "react-client-manifest.json")));
    const a = manifest["./pages/A.js"];
    const b = manifest["./pages/B.js"];
    assert.ok(a && b, "Both Flight references must be registered");
    const files = new Set([...a.chunks, ...b.chunks].filter((_, index) => index % 2 === 1));
    const sharedFiles = [...files].filter(file => fs.readFileSync(path.join(out, file), "utf8").includes("let") && fs.statSync(path.join(out, file)).size > 50000);
    assert.equal(sharedFiles.length, 1, "The large shared module must only be emitted once");
    for (const file of ["client.js", ...files]) {
      const body = fs.readFileSync(path.join(out, file));
      if (body.length < 1024) continue;
      assert.deepEqual(zlib.brotliDecompressSync(fs.readFileSync(path.join(out, file + ".br"))), body);
      assert.deepEqual(zlib.gunzipSync(fs.readFileSync(path.join(out, file + ".gz"))), body);
    }
    const fetched = [];
    const sandbox = { console, setTimeout, clearTimeout, TextDecoder, TextEncoder, URL, location: { href: "https://example.test/preview/de" } };
    sandbox.self = sandbox;
    sandbox.document = {
      currentScript: { tagName: "SCRIPT", src: "https://example.test/preview/assets/client.js" },
      getElementsByTagName: () => [],
      createElement: () => ({ setAttribute() {}, parentNode: { removeChild() {} } }),
      head: { appendChild(script) {
        const file = new URL(script.src).pathname.replace("/preview/assets/", "");
        fetched.push(file);
        vm.runInContext(fs.readFileSync(path.join(out, file), "utf8"), context);
        script.onload?.({ type: "load", target: script });
      } },
    };
    const context = vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(out, "client.js"), "utf8"), context);
    const first = await sandbox.loadReference(a);
    assert.equal(first.increment(), 1);
    const second = await sandbox.loadReference(b);
    assert.equal(second.read(), 1, "References must use the same module instance");
    assert.equal(second.data, first.data);
    assert.equal(fetched.filter(file => file === sharedFiles[0]).length, 1);
    assert.equal(fetched.length, new Set(fetched).size);
  } finally {
    if (compiler) await new Promise(resolve => compiler.close(resolve));
    process.chdir(previousCwd);
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
    Object.assign(process.env, previousEnv);
    delete require.cache[configFile];
    fs.rmSync(root, { recursive: true, force: true });
  }
});
