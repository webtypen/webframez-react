const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");

test("route capture preserves Core model exports and skips auth initialization", () => {
  const script = `
    const assert = require("node:assert/strict");
    const fs = require("node:fs");
    const os = require("node:os");
    const path = require("node:path");
    const { pathToFileURL } = require("node:url");
    const Module = require("node:module");
    const root = process.cwd();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-route-capture-"));
    const originalLoad = Module._load;
    const previousCapture = process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES;
    const previousOutDir = process.env.WEBFRAMEZ_REACT_OUT_DIR;
    const source = fs.readFileSync("bin/webframez-react.mjs", "utf8");
    const start = source.indexOf("async function loadRouteBuildTargets(");
    const end = source.indexOf("\\nasync function waitForFile(", start);
    assert.ok(start >= 0 && end > start);
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const capture = new AsyncFunction("require", "path", "process", "pathToFileURL", "packageRoot", "projectRoot", "mapTargetPath", "routesPath", "outDir", "runtimeOutDir", source.slice(start, end) + "\\nreturn await loadRouteBuildTargets(routesPath, outDir, runtimeOutDir);");
    const fixture = path.join(dir, "routes.cjs");
    fs.writeFileSync(fixture, [
      'const requireFramework = require("node:module").createRequire(' + JSON.stringify(path.join(root, "package.json")) + ');',
      'const { Route, Model, ModelAuth, Field } = requireFramework("@webtypen/webframez-core");',
      'if (typeof ModelAuth !== "function") throw new Error("Missing ModelAuth export");',
      'class User extends Model {}',
      'Field({ required: true })(User.prototype, "email");',
      'const auth = () => { throw new Error("Auth must only initialize on requests"); };',
      'Route.auth("/api/auth", { auth });',
      'Route.databuilder("/api/models", { models: { User } });',
      'Route.patch("/api/model", () => {});',
      'requireFramework("@webtypen/webframez-react").initWebframezReact(Route).renderReact("/", { auth });',
    ].join("\\n"));
    const { Router } = require("@webtypen/webframez-core");
    const before = JSON.stringify([Router.routesGET, Router.routesPOST]);
    (async () => {
      try {
        const targets = await capture(require, path, process, pathToFileURL, root, root, value => value, fixture, dir, dir);
        assert.equal(targets.length, 1);
        assert.equal(targets[0].path, "/");
        assert.equal(JSON.stringify([Router.routesGET, Router.routesPOST]), before);
        assert.equal(Module._load, originalLoad);
        assert.equal(process.env.WEBFRAMEZ_REACT_CAPTURE_ROUTES, previousCapture);
        assert.equal(process.env.WEBFRAMEZ_REACT_OUT_DIR, previousOutDir);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ["--conditions=react-server", "-e", script], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
    env: { ...process.env, NODE_OPTIONS: "" },
  });

  assert.equal(result.status, 0, result.stderr || String(result.error));
});
