const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const http = require("node:http");

const root = path.resolve(__dirname, "..");

test("a connected live-reload stream does not block graceful HTTP shutdown", { timeout: 10000 }, async t => {
  const source = `
    const http=require('node:http');
    const {createNodeRequestHandler}=require('./dist/http.cjs');
    const handler=createNodeRequestHandler({distRootDir:'.',pagesDir:'.'});
    const server=http.createServer(handler);
    server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));
    process.on('SIGTERM',()=>server.close(()=>{process.disconnect()}));
  `;
  const child = spawn(process.execPath, ["--conditions=react-server", "-e", source], {
    cwd: root, env: { ...process.env, NODE_ENV: "development", NODE_OPTIONS: "" }, stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  t.after(() => child.kill("SIGKILL"));
  let output = "";
  child.stderr.on("data", data => output += data);
  const closed = once(child, "close");
  const [{ port }] = await once(child, "message");
  const request = http.get({ hostname: "127.0.0.1", port, path: "/__webframez_live_reload", headers: { Accept: "text/event-stream" } });
  t.after(() => request.destroy());
  const [response] = await once(request, "response");
  const ended = once(response, "end");
  response.resume();
  child.kill("SIGTERM");
  await ended;
  assert.deepEqual(await closed, [0, null], output);
});
