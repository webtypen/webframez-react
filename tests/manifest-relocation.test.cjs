const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const {fileURLToPath, pathToFileURL} = require('node:url');
const vm = require('node:vm');
const test = require('node:test');
const {transformSync} = require('esbuild');
const source = readFileSync(path.join(__dirname, '../src/http.ts'), 'utf8');
const start = source.indexOf('function normalizeClientManifest(');
const end = source.indexOf('\nfunction createServerConsumerManifest(', start);
assert.ok(start >= 0 && end > start);
const code = transformSync(source.slice(start, end), {loader:'ts'}).code;
const normalize = vm.runInNewContext(code + '\nnormalizeClientManifest', {path, fileURLToPath, pathToFileURL});
const options = {cwd:'/srv/website/build0', distRootDir:'/srv/website/build0/dist'};

test('relocated app references preserve default and named exports and browser module IDs', () => {
  const entry = {id:'./dist/app/Website/My Client.js', chunks:['client.js'], name:'*'};
  const named = {...entry, name:'Widget'};
  const manifest = {
    'file:///tmp/build-checkout/dist/app/Website/My%20Client.js':entry,
    './dist/app/Website/My Client.js':entry,
    './dist/app/Website/My Client.js#':{...entry, name:'default'},
    'dist/app/Website/My Client.js#Widget':named,
  };
  const result = normalize(manifest, options);
  assert.equal(result['file:///srv/website/build0/dist/app/Website/My%20Client.js'], entry);
  assert.equal(result['file:///srv/website/build0/dist/app/Website/My%20Client.js#'].name, 'default');
  assert.equal(result['file:///srv/website/build0/dist/app/Website/My%20Client.js#Widget'], named);
  assert.equal(result['/srv/website/build0/dist/app/Website/My Client.js#Widget'], named);
  assert.equal(result['file:///tmp/build-checkout/dist/app/Website/My%20Client.js'], entry);
  assert.equal(Object.keys(manifest).length, 4);
});

test('package relocation preserves explicit export suffixes', () => {
  const entry = {id:'./node_modules/example/index.js', name:'Widget'};
  const result = normalize({'file:///tmp/build/node_modules/example/index.js#Widget':entry}, options);
  assert.equal(result['file:///srv/website/build0/node_modules/example/index.js#Widget'], entry);
  assert.equal(result['file:///srv/website/build0/node_modules/example/index.js'], undefined);
});

test('relative references outside build output or dependencies are not relocated', () => {
  const manifest = {'../outside.js':{}, './dist/../../outside.js':{}, 'https://example.com/module.js':{}};
  assert.deepEqual(Object.keys(normalize(manifest, options)), Object.keys(manifest));
});

test('existing runtime aliases take precedence', () => {
  const live = {id:'live', name:'*'};
  const result = normalize({'./dist/app.js':{id:'old'}, 'file:///srv/website/build0/dist/app.js':live}, options);
  assert.equal(result['file:///srv/website/build0/dist/app.js'], live);
});

test('copied build resolves client pages outside the public asset directory', () => {
  const entry = {id:'./build/app/Public/react/Form.js', name:'Form'};
  const options = {cwd:'/srv/api/build', distRootDir:'/srv/api/build/webframez-react/onboarding', pagesDir:'/srv/api/build/app/Public/react'};
  const result = normalize({'./build/app/Public/react/Form.js#Form':entry}, options);
  assert.equal(result['file:///srv/api/build/app/Public/react/Form.js#Form'], entry);
});

test('page aliases cannot escape the configured page root', () => {
  const manifest = {'./build/app/Public/react/../../../../secret.js#value':{id:'secret'}};
  const options = {cwd:'/srv/api/build', distRootDir:'/srv/api/build/webframez-react/onboarding', pagesDir:'/srv/api/build/app/Public/react'};
  assert.deepEqual(Object.keys(normalize(manifest, options)), Object.keys(manifest));
});

test('initial HTML uses the same model slot as the client loader fragment for stable React IDs', async () => {
 const React = require('react');
 const { renderToString } = require('react-dom/server');
 const source = readFileSync(path.join(__dirname, '../src/http.ts'), 'utf8');
 const start = source.indexOf('async function renderHtmlFromFlightData(');
 const end = source.indexOf('\nprocess.on("message"', start + 1);
 function Field() { const id = React.useId(); return React.createElement('label',{htmlFor:id},React.createElement('input',{id})); }
 const model = React.createElement(Field);
 const renderInitial = vm.runInNewContext(source.slice(start,end)+'\nrenderHtmlFromFlightData', {
  React, require, globalThis:{}, decodeFlightPayloadFromString:async()=>({model}), renderHtml:async(tree)=>renderToString(tree),
 });
 const expected = renderToString(React.createElement(React.Fragment,null,null,model));
 assert.equal(await renderInitial('',{}), expected);
 assert.notEqual(expected, renderToString(model));
});
