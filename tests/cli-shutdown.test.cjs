const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { setTimeout: delay } = require("node:timers/promises");

const root = path.resolve(__dirname, "..");

async function waitFor(file) {
  for (let i = 0; i < 150; i++) {
    if (fs.existsSync(file)) return;
    await delay(20);
  }
  throw Error(`Timeout waiting for ${file}`);
}

for (const command of ["watch:server", "watch:client", "watch:routes"]) {
  test(`${command} forwards interruption and awaits its watchers`, { skip: process.platform === "win32", timeout: 10000 }, async t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-cli-stop-"));
    fs.mkdirSync(path.join(dir, "node_modules/.bin"), { recursive: true });
    fs.mkdirSync(path.join(dir, "src"));
    fs.writeFileSync(path.join(dir, "src/server.ts"), "export {};");
    fs.writeFileSync(path.join(dir, "src/client.tsx"), "export {};");
    for (const binary of ["tsc", "webpack", "sass"]) {
      fs.writeFileSync(path.join(dir, `node_modules/.bin/${binary}`), `#!${process.execPath}\nconst fs=require('fs');fs.writeFileSync(${JSON.stringify(path.join(dir, binary + ".pid"))},String(process.pid));process.on('SIGTERM',()=>setTimeout(()=>{fs.writeFileSync(${JSON.stringify(path.join(dir, binary + ".stopped"))},'done');process.exit(0)},100));setInterval(()=>{},1000);`, { mode: 0o755 });
    }
    const routes = path.join(dir, "routes.cjs");
    fs.writeFileSync(path.join(dir, "src/style.scss"), "body {}");
    fs.writeFileSync(routes, `const r=require('node:module').createRequire(${JSON.stringify(path.join(root, "package.json"))}); const {Route}=r('@webtypen/webframez-core'); r('@webtypen/webframez-react').initWebframezReact(Route).renderReact('/', {pagesDir:${JSON.stringify(path.join(dir, "src"))},distRootDir:${JSON.stringify(path.join(dir, "dist"))},styleSrcPath:${JSON.stringify(path.join(dir, "src/style.scss"))}});`);
    const args = [path.join(root, "bin/webframez-react.mjs"), command];
    if (command === "watch:routes") args.push(`--routes=${routes}`, `--out-dir=${path.join(dir, "dist")}`);
    const child = spawn(process.execPath, args, { cwd: dir, env: { ...process.env, NODE_OPTIONS: "" }, stdio: ["ignore", "pipe", "pipe"] });
    const closed = once(child, "close");
    let output = "";
    child.stdout.on("data", data => output += data);
    child.stderr.on("data", data => output += data);
    t.after(() => {
      child.kill("SIGKILL");
      for (const binary of ["tsc", "webpack", "sass"]) {
        if (fs.existsSync(path.join(dir, binary + ".pid"))) {
          try { process.kill(Number(fs.readFileSync(path.join(dir, binary + ".pid"))), "SIGKILL"); } catch {}
        }
      }
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const binary = command === "watch:server" ? "tsc" : "webpack";
    try { await waitFor(path.join(dir, binary + ".pid")); } catch (error) { throw Error(error.message + "\n" + output); }
    child.kill("SIGINT");
    await delay(25);
    child.kill("SIGINT");
    assert.deepEqual(await closed, [0, null], output);
    assert.ok(fs.existsSync(path.join(dir, binary + ".stopped")), output);
    assert.doesNotMatch(output, /Build command failed/);
    for (const name of ["tsc", "webpack", "sass"]) {
      if (fs.existsSync(path.join(dir, name + ".pid"))) {
        assert.ok(fs.existsSync(path.join(dir, name + ".stopped")), name + " was not shut down");
      }
    }
  });
}

test("a watch child terminated unexpectedly is reported as a failure", { skip: process.platform === "win32", timeout: 10000 }, async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-cli-failure-"));
  fs.mkdirSync(path.join(dir, "node_modules/.bin"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src/server.ts"), "export {};");
  fs.writeFileSync(path.join(dir, "node_modules/.bin/tsc"), `#!${process.execPath}\nprocess.kill(process.pid, 'SIGKILL');`, { mode: 0o755 });
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const child = spawn(process.execPath, [path.join(root, "bin/webframez-react.mjs"), "watch:server"], {
    cwd: dir, env: { ...process.env, NODE_OPTIONS: "" }, stdio: "ignore",
  });
  t.after(() => child.kill("SIGKILL"));
  assert.deepEqual(await once(child, "close"), [137, null]);
});
