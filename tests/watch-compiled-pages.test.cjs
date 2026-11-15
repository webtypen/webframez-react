const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const webpack = require("webpack");

test("watch rebuilds compiled Flight components inside dist without an asset feedback loop", { timeout: 20000 }, async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "react-watch-compiled-"));
    const pages = path.join(root, "dist/app/Website");
    const out = path.join(root, "dist");
    const previousCwd = process.cwd();
    const previousEnv = { ...process.env };
    const configFile = require.resolve("../defaults/webpack.client.cjs");
    let compiler;
    let watcher;
    try {
        fs.mkdirSync(pages, { recursive: true });
        fs.writeFileSync(path.join(root, "package.json"), '{"private":true}');
        fs.symlinkSync(path.resolve(__dirname, "../node_modules"), path.join(root, "node_modules"), "dir");
        const component = path.join(pages, "Hero.js");
        fs.writeFileSync(component, '"use client"; export default function Hero(){ return "before-watch-update"; }');
        fs.writeFileSync(path.join(root, "entry.js"), 'import "react-server-dom-webpack/client";');
        process.chdir(root);
        Object.assign(process.env, { NODE_ENV: "development", WEBFRAMEZ_REACT_PAGES_DIR: pages, WEBFRAMEZ_REACT_DIST_ROOT_DIR: out, WEBFRAMEZ_REACT_CLIENT_ENTRY: path.join(root, "entry.js"), WEBFRAMEZ_REACT_WATCH_POLL: "100" });
        delete require.cache[configFile];
        const config = require(configFile);
        compiler = webpack({ ...config, cache: false, module: { rules: [] } });
        let builds = 0;
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error("Compiled Client Component change did not rebuild")), 10000);
            watcher = compiler.watch(config.watchOptions, (error, stats) => {
                if (error || stats.hasErrors()) {
                    clearTimeout(timer);
                    reject(error || new Error(stats.toString({ all: false, errors: true })));
                    return;
                }
                builds++;
                const manifest = JSON.parse(fs.readFileSync(path.join(out, "react-client-manifest.json")));
                const reference = manifest["./dist/app/Website/Hero.js"];
                const chunks = reference.chunks.filter((_, index) => index % 2 === 1);
                const body = chunks.map(file => fs.readFileSync(path.join(out, file), "utf8")).join("\n");
                if (builds === 1) {
                    assert.match(body, /before-watch-update/);
                    setTimeout(() => fs.writeFileSync(component, '"use client"; export default function Hero(){ return "after-watch-update"; }'), 250);
                } else if (body.includes("after-watch-update")) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
        const completedBuilds = builds;
        await new Promise(resolve => setTimeout(resolve, 1500));
        assert.equal(builds, completedBuilds, "Emitting bundles and manifests must not restart compilation");
    } finally {
        if (watcher) await new Promise(resolve => watcher.close(resolve));
        if (compiler) await new Promise(resolve => compiler.close(resolve));
        process.chdir(previousCwd);
        for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key];
        Object.assign(process.env, previousEnv);
        delete require.cache[configFile];
        fs.rmSync(root, { recursive: true, force: true });
    }
});
