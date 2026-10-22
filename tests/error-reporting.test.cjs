const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createFileRouter } = require("../dist/router.cjs");
const { ErrorHandler } = require("@webtypen/webframez-core");

async function fixture(t, code, hook) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webframez-route-error-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    fs.writeFileSync(path.join(dir, "index.js"), code);
    fs.writeFileSync(path.join(dir, "errors.js"), 'exports.default = context => context.message;');
    return createFileRouter({ pagesDir: dir, onError: hook });
}

test("route and asynchronous Data failures reach the error channel with safe responses", async t => {
    const events = [];
    t.mock.method(ErrorHandler, "report", async (error, context) => { events.push({ error, context }); });
    for (const code of [
        'exports.default = () => { throw new Error("private route error"); };',
        'exports.Data = async () => { throw new Error("private data error"); }; exports.default = () => "ok";',
    ]) {
        const router = await fixture(t, code);
        const result = await router.resolve({ pathname: "/", searchParams: {} });
        assert.equal(result.statusCode, 500);
        assert.equal(result.model, "Internal server error");
    }
    assert.equal(events.length, 2);
});

test("claimed customer errors stay out of core reporting; context reaches the error page", async t => {
    const events = [];
    t.mock.method(ErrorHandler, "report", async error => { events.push(error); });
    const router = await fixture(t, 'exports.Data = () => ({website: "one"}); exports.default = () => { throw new Error("customer code"); };', (error, context) => {
        assert.equal(context.data.website, "one");
        context.data.localError = error.message;
        return true;
    });
    const result = await router.resolve({ pathname: "/", searchParams: {} });
    assert.equal(result.statusCode, 500);
    assert.equal(result.context.data.localError, "customer code");
    assert.equal(events.length, 0);
});

test("expected route aborts are not exceptions", async t => {
    let reported = 0;
    const router = await fixture(t, 'exports.default = ({abort}) => abort({status:404,message:"missing"});', () => { reported++; });
    const result = await router.resolve({ pathname: "/", searchParams: {} });
    assert.equal(result.statusCode, 404);
    assert.equal(reported, 0);
});
