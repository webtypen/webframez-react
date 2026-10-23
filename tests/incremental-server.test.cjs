const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');

test('persistent server builds delegate to the public Core compiler while explicit flags retain tsc',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'react-incremental-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  for(const dir of ['node_modules/@webtypen/webframez-core','node_modules/typescript','node_modules/.bin','src'])await fs.mkdir(path.join(root,dir),{recursive:true});
  await fs.writeFile(path.join(root,'package.json'),'{}');
  await fs.writeFile(path.join(root,'src/server.ts'),'export {};');
  await fs.writeFile(path.join(root,'node_modules/typescript/index.js'),`exports.sys={readFile:()=>''};exports.readConfigFile=()=>({config:{}});exports.parseJsonConfigFileContent=()=>({options:{outDir:${JSON.stringify(path.join(root,'dist'))}}});`);
  await fs.writeFile(path.join(root,'node_modules/@webtypen/webframez-core/index.js'),`exports.BuildApplication=class {constructor(root,config,options){this.data={root,config,options}}async compile(){require('fs').writeFileSync('compiler.json',JSON.stringify(this.data));}};`);
  await fs.writeFile(path.join(root,'node_modules/.bin/tsc'),`#!${process.execPath}\nrequire('fs').writeFileSync('tsc.json',JSON.stringify(process.argv.slice(2)));`,{mode:0o755});
  const cache=path.join(root,'.webframez-cache');
  const run=args=>promisify(execFile)(process.execPath,[path.resolve(__dirname,'../bin/webframez-react.mjs'),'build:server',...args],{cwd:root,env:{...process.env,WEBFRAMEZ_BUILD_CACHE_DIRECTORY:cache}});
  await run([]);
  const result=JSON.parse(await fs.readFile(path.join(root,'compiler.json'),'utf8'));
  assert.equal(result.config.build.cacheDirectory,cache);assert.equal(result.options.outDir,path.join(root,'dist'));
  await assert.rejects(fs.access(path.join(root,'tsc.json')),{code:'ENOENT'});
  await run(['--','--noEmit']);
  assert.ok(JSON.parse(await fs.readFile(path.join(root,'tsc.json'),'utf8')).includes('--noEmit'));
});
