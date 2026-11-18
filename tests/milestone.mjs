import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import http from 'node:http';
import { spawn } from 'node:child_process';

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-milestone-'));
const environment = { ...process.env, FOLIO_DATA_DIR: fixture };
const settings = JSON.parse(fs.readFileSync('data/settings.json','utf8'));
const english = JSON.parse(fs.readFileSync('data/locales/en.json','utf8'));
const labels = { ...english, ...JSON.parse(fs.readFileSync(`data/locales/${settings.language}.json`,'utf8')) };
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
  await mutate('updateCharacters',{characters:[{name:'Mara Vale',role:'Cartographer',introduction:'A mapmaker with an <em>empty</em> atlas.'},{name:'Ivo Reed',role:'Courier',introduction:'He remembers every road.'}]});
  const staleCharacters = novel.revision;
  await mutate('updateCharacters',{characters:[novel.characters[1],novel.characters[0]]});
  await post({action:'updateCharacters',id:novel.id,revision:staleCharacters,characters:[]},409);
  const libraryHtml = await (await fetch(base)).text();
  assert.match(libraryHtml,/Milestone novel/);
  assert.match(libraryHtml,/Renamed genre/);
  assert.doesNotMatch(libraryHtml,/>Writing workspace</);
  const detail = await fetch(`${base}/novels/${novel.id}/`);
  assert.equal(detail.status,200);
  const detailHtml = await detail.text();
  assert.match(detailHtml,/An edited novel description/);
  assert.ok(detailHtml.includes(labels.new_chapter));
  assert.ok(detailHtml.includes(labels.main_characters));
  assert.ok(detailHtml.includes(labels.add_character));
  assert.ok(detailHtml.includes(labels.delete_novel));
  assert.match(detailHtml,/Mara Vale/);
  assert.match(detailHtml,/&lt;em&gt;empty&lt;\/em&gt;/);
  await mutate('createChapter',{title:'Published chapter'});
  await mutate('saveChapter',{number:1,title:'Published chapter',markdown:'# PUBLISHED_SENTINEL\n\nVisible to readers. $E = mc^2$\n\n$$\n\\frac{1}{2}\n$$\n\n| Item | Qty |\n| :--- | ---: |\n| Maps | 3 |'});
  await mutate('createChapter',{title:'PRIVATE_CHAPTER_TITLE'});
  await mutate('saveChapter',{number:2,title:'PRIVATE_CHAPTER_TITLE',markdown:'PRIVATE_CHAPTER_BODY'});
  await mutate('reorder',{order:[2,1]});
  await mutate('updateContents',{contents:[
    {type:'volume',id:'private-volume',title:'PRIVATE_VOLUME_TITLE',description:'PRIVATE_VOLUME_DESCRIPTION',chapters:[{type:'chapter',number:2}]},
    {type:'volume',id:'public-volume',title:'PUBLIC_VOLUME_TITLE',description:'PUBLIC_VOLUME_DESCRIPTION',chapters:[{type:'chapter',number:1}]},
  ]});
  const groupedHtml = await (await fetch(`${base}/novels/${novel.id}/`)).text();
  assert.match(groupedHtml,/PRIVATE_VOLUME_TITLE/);
  assert.match(groupedHtml,/PUBLIC_VOLUME_TITLE/);
  assert.ok(groupedHtml.includes(labels.organize_contents));
  await mutate('createChapter',{title:'DELETED_CHAPTER_TITLE'});
  await mutate('saveChapter',{number:3,title:'DELETED_CHAPTER_TITLE',markdown:'DELETED_CHAPTER_BODY'});
  await mutate('publishChapter',{number:3});
  await mutate('deleteChapter',{number:3});
  assert.equal(novel.publication,'draft');
  assert.equal((await fetch(`${base}/novels/${novel.id}/chapter-3/`)).status,404);
  assert.equal(fs.readFileSync(path.join(fixture,'novels',novel.id,'chapter-3.md'),'utf8'),'DELETED_CHAPTER_BODY');
  let removed = await post({action:'createNovel',title:'DELETED_NOVEL_TITLE',author:'Test author'});
  removed = await post({action:'createChapter',id:removed.id,revision:removed.revision,title:'Deleted novel chapter'});
  removed = await post({action:'saveChapter',id:removed.id,revision:removed.revision,number:1,title:'Deleted novel chapter',markdown:'DELETED_NOVEL_BODY'});
  removed = await post({action:'publishChapter',id:removed.id,revision:removed.revision,number:1});
  await post({action:'deleteNovel',id:removed.id,revision:removed.revision},403,'https://other.example');
  await post({action:'deleteNovel',id:removed.id,revision:'stale'},409);
  await post({action:'deleteNovel',id:removed.id,revision:removed.revision});
  assert.equal((await fetch(`${base}/novels/${removed.id}/`)).status,404);
  assert.equal((await fetch(`${base}/api/cms/?id=${removed.id}`)).status,404);
  const preview = await post({action:'preview',markdown:novel.chapters[0].markdown});
  assert.match(preview.html,/PRIVATE_CHAPTER_BODY/);
  const mathPreview = await post({action:'preview',markdown:'Inline $x^2$.\n\n$$\n\\sqrt{x}\n$$'});
  assert.match(mathPreview.html,/class="katex"/);
  assert.match(mathPreview.html,/class="katex-display"/);
  const tablePreview = await post({action:'preview',markdown:'| Item | Qty |\n| :--- | ---: |\n| Maps | 3 |'});
  assert.match(tablePreview.html,/<table>/);
  assert.match(tablePreview.html,/<td align="right">3<\/td>/);
  await command(['run','build:static']);
  assert.ok(fs.existsSync('out/index.html'));
  assert.ok(!files('out').some(file => file.includes(novel.id)), 'All-draft novels must have no exported routes');
  for (const file of files('out')) assert.equal(fs.readFileSync(file).includes(Buffer.from('Mara Vale')),false,`Draft character leaked into ${file}`);
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
  assert.ok(liveHtml.includes(labels.edit_chapter));
  assert.match(liveHtml,/data-word-count="3"/);
  assert.ok(liveHtml.includes(labels.delete_chapter));
  assert.equal((await fetch(`${base}/novels/${novel.id}/chapter-2/?write=1`)).status,200);
  const hidden = await post({action:'createNovel',title:'PRIVATE_NOVEL_TITLE',author:'Private author'});
  await post({action:'updateCharacters',id:hidden.id,revision:hidden.revision,characters:[{name:'PRIVATE_CHARACTER_NAME',introduction:'PRIVATE_CHARACTER_INTRODUCTION'}]});
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
    for (const marker of ['PRIVATE_VOLUME_TITLE','PRIVATE_VOLUME_DESCRIPTION','PRIVATE_CHAPTER_TITLE','PRIVATE_CHAPTER_BODY','PRIVATE_NOVEL_TITLE','PRIVATE_WORKING_TITLE','PRIVATE_WORKING_BODY','PRIVATE_EXTERNAL_REVISION','PRIVATE_CHARACTER_NAME','PRIVATE_CHARACTER_INTRODUCTION','DELETED_CHAPTER_TITLE','DELETED_CHAPTER_BODY','DELETED_NOVEL_TITLE','DELETED_NOVEL_BODY']) assert.equal(bytes.includes(Buffer.from(marker)),false,`Private or deleted content leaked into ${file}`);
    assert.equal(bytes.includes(Buffer.from('createNovel')),false,`CMS code leaked into ${file}`);
  }
  const staticPort = await freePort();
  const previewServer = await startServer('scripts/preview-static.mjs',[],{...environment,PORT:String(staticPort)});
  const staticBase = `http://127.0.0.1:${staticPort}`;
  await waitReady(staticBase,previewServer);
  const staticChapter = await fetch(`${staticBase}/novels/${novel.id}/chapter-1/`);
  assert.equal(staticChapter.status,200);
  const staticHtml = (await staticChapter.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  assert.match(staticHtml,/PUBLISHED_SENTINEL/);
  assert.match(staticHtml,/PUBLIC_VOLUME_TITLE/);
  assert.ok(staticHtml.includes(labels.chapter.replace('{number}','1')));
  assert.match(staticHtml,/class="katex"/);
  assert.match(staticHtml,/class="katex-display"/);
  assert.match(staticHtml,/<mfrac>/);
  assert.match(staticHtml,/<div class="markdown-table" tabindex="0"><table>/);
  assert.match(staticHtml,/<td align="right">3<\/td>/);
  const cssFiles = exported.filter(file => file.endsWith('.css'));
  const katexCss = cssFiles.map(file => fs.readFileSync(file,'utf8')).join('\n');
  assert.match(katexCss,/KaTeX_Main/);
  const fontURLs = [...katexCss.matchAll(/url\(["']?([^)'"\s]+\.woff2)["']?\)/g)].map(match => match[1]);
  assert.ok(fontURLs.length > 0, 'KaTeX fonts must be bundled for offline reading');
  for (const url of fontURLs) {
    assert.ok(!/^https?:/.test(url), 'Font URLs must be local');
    const font = await fetch(new URL(url, `${staticBase}/_next/static/chunks/styles.css`));
    assert.equal(font.status,200,`Missing exported font: ${url}`);
  }
  assert.match(staticHtml,/data-word-count="9"/);
  for (const key of ['edit_chapter','publish_chapter','save_draft','delete_chapter']) assert.ok(!staticHtml.includes('>'+labels[key]+'<'));
  const staticLibrary = (await (await fetch(staticBase)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const staticDetails = (await (await fetch(`${staticBase}/novels/${novel.id}/`)).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  assert.ok(staticDetails.includes(labels.main_characters));
  assert.match(staticDetails,/Mara Vale/);
  assert.match(staticDetails,/PUBLIC_VOLUME_DESCRIPTION/);
  assert.ok(!staticDetails.includes(labels.organize_contents));
  assert.match(staticDetails,/data-word-count="9"/);
  assert.match(staticDetails,/&lt;em&gt;empty&lt;\/em&gt;/);
  assert.ok(staticDetails.indexOf('Ivo Reed') < staticDetails.indexOf('Mara Vale'));
  for (const key of ['add_character','edit_character','remove_character','delete_novel','delete_chapter']) assert.ok(!staticDetails.includes('>'+labels[key]+'<'));
  for (const key of ['new_novel','edit_details']) assert.ok(!staticLibrary.includes('>'+labels[key]+'<'));
  assert.equal((await fetch(`${staticBase}/studio/`)).status,404);
  assert.equal((await fetch(`${staticBase}/api/cms/`)).status,404);
  assert.equal((await fetch(`${staticBase}/novels/${novel.id}/chapter-2/`)).status,404);
  await mutate('deleteChapter',{number:1});
  assert.equal(novel.publication,'draft');
  await command(['run','build:static']);
  assert.ok(!files('out').some(file => file.includes(novel.id) || file.includes(removed.id)));
  console.log('\nMilestone integration passed: local writes, conflicts, publication snapshots, dynamic reader, static isolation and direct URLs.\n');
} finally {
  for (const child of processes) {
    if (child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit',resolve)); }
  }
  // Never fall back to a private library configured in .env.local or the shell.
  await command(['run','build:static'],{...process.env,FOLIO_DATA_DIR:path.resolve('data')});
  fs.rmSync(fixture,{recursive:true,force:true});
}
