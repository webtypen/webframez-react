const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const test = require('node:test');
const root = path.resolve(__dirname, '..');

test('Core config drives React defaults, groups, assets and request-local URL helpers', () => {
 const script = `
  const assert = require('node:assert/strict');
  const {Config, Router, Route} = require('@webtypen/webframez-core');
  const {initWebframezReact, resolveWebframezReactRouteOptions, getRegisteredReactBuildTargets} = require('./dist/webframez-core.cjs');
  const {appPath, getBasename} = require('./dist/paths.cjs');
  Config.set('application.router.basename', '/site/');
  const reactRoute = initWebframezReact(Route);
  Router.init({routesFunction(){
   Route.group({prefix:'/group'},()=>reactRoute.renderReact('/admin'));
  }});
  const options = resolveWebframezReactRouteOptions('/admin');
  assert.equal(options.basePath,'/site/admin');
  assert.equal(options.assetsPrefix,'/site/admin/assets/');
  assert.equal(options.rscPath,'/site/admin/rsc');
  assert.equal(options.clientScriptUrl,'/site/admin/assets/client.js');
  assert.ok(Router.routesGET['/site/group/admin/*']);
  const target = getRegisteredReactBuildTargets()[0];
  assert.equal(target.routeKey,'admin');
  assert.ok(!target.distRootDir.includes('/site/'));
  const custom = resolveWebframezReactRouteOptions('/',{assetsPrefix:'https://cdn.example/assets/',rscPath:'/rsc-custom',liveReloadPath:'/reload'});
  assert.equal(custom.assetsPrefix,'https://cdn.example/assets/');
  assert.equal(custom.rscPath,'/site/rsc-custom');
  assert.equal(custom.liveReloadPath,'/site/reload');
  const mounted = resolveWebframezReactRouteOptions('/',{basePath:'/site'});
  assert.equal(mounted.basePath,'/site');
  const context = globalThis.__WEBFRAMEZ_ROUTING_CONTEXT__;
  Promise.all(['/a','/b'].map((base,i)=>context.run(base,async()=>{
   await new Promise(r=>setTimeout(r,i?5:20));
   assert.equal(getBasename(),base);
   assert.equal(appPath('/api'),base+'/api');
  }))).then(()=>{assert.equal(getBasename(),'/site');process.stdout.write('OK');});
 `;
 const result=spawnSync(process.execPath,['--conditions=react-server','-e',script],{cwd:root,encoding:'utf8',timeout:15000,env:{...process.env,NODE_OPTIONS:''}});
 assert.equal(result.status,0,result.stderr || String(result.error));assert.match(result.stdout,/OK/);
});

test('browser paths entry bundles without Node or Core server dependencies',()=>{
 const {buildSync}=require('esbuild');
 const output = require('node:fs').readFileSync(path.join(root,'dist/paths.cjs'),'utf8');
 assert.doesNotMatch(output, /require\(["']@webtypen\/webframez-core/);
 const result=buildSync({stdin:{contents:'import {appPath} from "./dist/paths.js"; console.log(appPath("/api"));',resolveDir:root},bundle:true,platform:'browser',write:false,metafile:true});
 assert.ok(result.outputFiles[0].text.includes('appPath'));
 assert.ok(Object.keys(result.metafile.inputs).every(file=>!file.includes('Router/Router') && !file.includes('Config')));
});
