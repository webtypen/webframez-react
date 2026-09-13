const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const vm = require("node:vm");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
// Exercise the exact script sent to the HTML worker, without adding a public API.
const source = readFileSync(path.join(projectRoot, "src/http.ts"), "utf8");
const marker = "const INITIAL_HTML_WORKER_SCRIPT = ";
const start = source.indexOf(marker) + marker.length;
assert.ok(start >= marker.length);
const end = source.indexOf("\n`;", start) + 2;
assert.ok(end > start);
const workerScript = vm.runInNewContext(source.slice(start, end));

for (const mode of ["development", "production"]) {
  test(`HTML worker resolves React DOM's private scheduler in ${mode}`, () => {
    // The app declares React DOM, but scheduler belongs to React DOM's own dependencies.
    const probe = `
      const assert = require("node:assert/strict");
      const appRequire = Module.createRequire(path.join(process.cwd(), "package.json"));
      const domRequire = Module.createRequire(appRequire.resolve("react-dom/package.json"));
      assert.ok(domRequire.resolve("scheduler"));
      assert.equal(typeof appRequire("react-dom/client").createRoot, "function");
      process.stdout.write("worker dependencies loaded");
      process.exit(0);
    `;
    const result = spawnSync(process.execPath, ["-e", workerScript + probe], {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: mode, NODE_OPTIONS: "" },
      encoding: "utf8",
      timeout: 15000,
    });
    assert.equal(result.status, 0, result.stderr || String(result.error));
    assert.match(result.stdout, /worker dependencies loaded/);
  });
}
