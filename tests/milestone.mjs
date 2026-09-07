import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-milestone-'));
const environment = { ...process.env, FOLIO_DATA_DIR: fixture };
const processes = [];
function command(args, env = environment) {
  return new Promise((resolve,reject) => {
    const child = spawn('npm',args,{env,stdio:'inherit'});
    child.once('error',reject);
    child.once('exit',code => code === 0 ? resolve() : reject(new Error(`npm ${args.join(' ')} exited ${code}`)));
  });
}
async function freePort() {
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0,'127.0.0.1',resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  return port;
}
async function startServer(script,args,env) {
  const child = spawn(process.execPath,[script,...args],{env,stdio:['ignore','pipe','pipe']});
  processes.push(child);
  child.stdout.on('data',chunk => process.stdout.write(chunk));
  child.stderr.on('data',chunk => process.stderr.write(chunk));
  return child;
}
async function waitReady(url,child) {
  for (let i=0;i<100;i++) {
    if (child.exitCode !== null) throw new Error('Server exited before readiness');
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve,100));
  }
  throw new Error('Server did not become ready');
}
function files(directory) { return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(path.join(directory,entry.name)) : [path.join(directory,entry.name)]); }
try {
  await command(['run','build:cms']);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = await startServer('node_modules/next/dist/bin/next',['start','--hostname','127.0.0.1','--port',String(port)],{...environment,FOLIO_MODE:'cms'});
  await waitReady(base,server);
  const post = async (body, expected = 200, origin = base) => {
    const response = await fetch(`${base}/api/cms/`,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
    const result = await response.json();
    assert.equal(response.status,expected,JSON.stringify(result)); return result;
  };
  await post({action:'createNovel',title:'Blocked',author:'Test'},403,'https://other.example');
  const noOrigin = await fetch(`${base}/api/cms/`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(noOrigin.status,403);
  const badHost = await new Promise((resolve,reject) => { const req = http.get(`${base}/api/cms/`,{headers:{Host:'other.example'}},res => { res.resume(); resolve(res.statusCode); }); req.on('error',reject); });
  assert.equal(badHost,403);
  let genres = await (await fetch(`${base}/api/cms/?genres=1`)).json();
  genres = await post({action:'createGenre',name:'Test genre',revision:genres.revision});
  genres = await post({action:'renameGenre',genreId:'Test genre',name:'Renamed genre',revision:genres.revision});
  let novel = await post({action:'createNovel',title:'Milestone novel',author:'Test writer',genreKey:'Test genre'});
  const mutate = async (action,extra={}) => { novel = await post({action,id:novel.id,revision:novel.revision,...extra}); return novel; };
  await mutate('updateNovel',{title:'Milestone novel',author:'Updated writer',genreKey:'Test genre',description:'An edited novel description',status:'ongoing'});
  const libraryHtml = await (await fetch(base)).text();
  assert.match(libraryHtml,/Milestone novel/);
  assert.match(libraryHtml,/Renamed genre/);
  assert.doesNotMatch(libraryHtml,/>Writing workspace</);
  const detail = await fetch(`${base}/novels/${novel.id}/`);
  assert.equal(detail.status,200);
  const detailHtml = await detail.text();
  assert.match(detailHtml,/An edited novel description/);
  assert.match(detailHtml,/New chapter/);
  await mutate('createChapter',{title:'Published chapter'});
  await mutate('saveChapter',{number:1,title:'Published chapter',markdown:'# PUBLISHED_SENTINEL\n\nVisible to readers.'});
  await mutate('createChapter',{title:'PRIVATE_CHAPTER_TITLE'});
  await mutate('saveChapter',{number:2,title:'PRIVATE_CHAPTER_TITLE',markdown:'PRIVATE_CHAPTER_BODY'});
  await mutate('reorder',{order:[2,1]});
  const preview = await post({action:'preview',markdown:novel.chapters[0].markdown});
  assert.match(preview.html,/PRIVATE_CHAPTER_BODY/);
  await command(['run','build:static']);
  assert.ok(fs.existsSync('out/index.html'));
  assert.ok(!files('out').some(file => file.includes(novel.id)), 'All-draft novels must have no exported routes');
  await mutate('publishChapter',{number:1});
  const stale = novel.revision;
  fs.writeFileSync(path.join(fixture,'novels',novel.id,'chapter-1.md'),'PRIVATE_EXTERNAL_REVISION');
  await post({action:'saveChapter',id:novel.id,revision:stale,number:1,title:'Stale',markdown:'Do not overwrite'},409);
  novel = await (await fetch(`${base}/api/cms/?id=${novel.id}`)).json();
  assert.equal(novel.chapters[1].markdown,'PRIVATE_EXTERNAL_REVISION');
  await mutate('saveChapter',{number:1,title:'PRIVATE_WORKING_TITLE',markdown:'PRIVATE_WORKING_BODY'});
  const live = await fetch(`${base}/novels/${novel.id}/chapter-1/`);
  assert.equal(live.status,200);
  const liveHtml = await live.text();
  assert.match(liveHtml,/PRIVATE_WORKING_BODY/);
  assert.match(liveHtml,/Edit chapter/);
  assert.equal((await fetch(`${base}/novels/${novel.id}/chapter-2/?write=1`)).status,200);
  const hidden = await post({action:'createNovel',title:'PRIVATE_NOVEL_TITLE',author:'Private author'});
  assert.equal((await fetch(`${base}/novels/${hidden.id}/`)).status,200);
  const blockedPage = await new Promise((resolve,reject) => { const req = http.get(`${base}/novels/${novel.id}/`,{headers:{Host:'other.example'}},res => { let body=''; res.on('data',chunk => body+=chunk); res.on('end',() => resolve({status:res.statusCode,body})); }); req.on('error',reject); });
  assert.equal(blockedPage.status,404);
  assert.doesNotMatch(blockedPage.body,/PRIVATE_WORKING_BODY/);
  await command(['run','build:static']);
  const exported = files('out');
  assert.ok(exported.includes(path.join('out','novels',novel.id,'chapter-1','index.html')));
  assert.ok(!exported.some(file => file.includes('chapter-2') || file.includes('/studio/') || file.includes('/api/')));
  for (const file of exported) {
    const bytes = fs.readFileSync(file);
    for (const marker of ['PRIVATE_CHAPTER_TITLE','PRIVATE_CHAPTER_BODY','PRIVATE_NOVEL_TITLE','PRIVATE_WORKING_TITLE','PRIVATE_WORKING_BODY','PRIVATE_EXTERNAL_REVISION']) assert.equal(bytes.includes(Buffer.from(marker)),false,`Private content leaked into ${file}`);
    assert.equal(bytes.includes(Buffer.from('createNovel')),false,`CMS code leaked into ${file}`);
  }
  const staticPort = await freePort();
  const previewServer = await startServer('scripts/preview-static.mjs',[],{...process.env,PORT:String(staticPort)});
  const staticBase = `http://127.0.0.1:${staticPort}`;
  await waitReady(staticBase,previewServer);
  const staticChapter = await fetch(`${staticBase}/novels/${novel.id}/chapter-1/`);
  assert.equal(staticChapter.status,200);
  const staticHtml = (await staticChapter.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  assert.match(staticHtml,/PUBLISHED_SENTINEL/);
  assert.doesNotMatch(staticHtml,/>Edit chapter<|>Publish chapter<|>Save draft</);
  const staticLibrary = (await (await fetch(staticBase)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  assert.doesNotMatch(staticLibrary,/>New novel<|>Edit details</);
  assert.equal((await fetch(`${staticBase}/studio/`)).status,404);
  assert.equal((await fetch(`${staticBase}/api/cms/`)).status,404);
  assert.equal((await fetch(`${staticBase}/novels/${novel.id}/chapter-2/`)).status,404);
  console.log('\nMilestone integration passed: local writes, conflicts, publication snapshots, dynamic reader, static isolation and direct URLs.\n');
} finally {
  for (const child of processes) {
    if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit',resolve)); }
  }
  // Leave the normal static output containing the user's own content.
  await command(['run','build:static'],process.env);
  fs.rmSync(fixture,{recursive:true,force:true});
}
