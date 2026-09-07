import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mutateContent, workspaceNovel, listNovels, readNovel, readMarkdown, listGenres, mutateGenres } from '../src/lib/content-store.ts';
import { renderMarkdown } from '../src/lib/markdown.ts';
import type { WorkspaceNovel } from '../src/lib/definitions.ts';

let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-test-')); process.env.FOLIO_DATA_DIR = directory; });
afterEach(() => { delete process.env.FOLIO_DATA_DIR; fs.rmSync(directory, { recursive: true, force: true }); });
const create = () => mutateContent({ action:'createNovel', title:'Test manuscript', author:'Writer' });
const mutate = (novel: WorkspaceNovel, action: string, extra: object = {}) => mutateContent({ id:novel.id, revision:novel.revision, action, ...extra });

test('create, save, reopen, reorder, and publish only one chapter', () => {
  let novel = create();
  assert.equal(novel.publication, 'draft');
  novel = mutate(novel, 'createChapter', { title:'First' });
  novel = mutate(novel, 'saveChapter', { number:1, title:'First', markdown:'# First\n\nHello.' });
  novel = mutate(novel, 'createChapter', { title:'Second' });
  novel = mutate(novel, 'saveChapter', { number:2, title:'Second', markdown:'A private draft.' });
  novel = mutate(novel, 'reorder', { order:[2,1] });
  novel = mutate(novel, 'publishChapter', { number:1 });
  assert.deepEqual(novel.chapters.map(chapter => chapter.number), [2,1]);
  assert.equal(novel.chapters[0].published, null);
  assert.equal(novel.publication, 'published');
  assert.equal(workspaceNovel(novel.id).chapters[1].markdown, '# First\n\nHello.');
  assert.equal(fs.readFileSync(path.join(directory,'novels',novel.id,'chapter-2.md'),'utf8'), 'A private draft.');
  const published = novel.chapters[1].published!;
  novel = mutate(novel, 'saveChapter', { number:1, title:'New draft title', markdown:'Unpublished revision' });
  assert.equal(readMarkdown(novel.id,published.contentFile), '# First\n\nHello.');
  assert.equal(novel.chapters[1].published!.title, 'First');
  novel = mutate(novel, 'unpublishChapter', { number:1 });
  assert.equal(novel.publication, 'draft');
});

test('external edits are loaded and stale saves are rejected without losing either version', () => {
  let novel = mutate(create(), 'createChapter', { title:'Draft' });
  fs.writeFileSync(path.join(directory,'novels',novel.id,'chapter-1.md'), 'Edited in a text editor');
  assert.throws(() => mutate(novel,'saveChapter',{number:1,title:'Draft',markdown:'Stale tab'}), /changed in another tab/);
  novel = workspaceNovel(novel.id);
  assert.equal(novel.chapters[0].markdown,'Edited in a text editor');
  novel = mutate(novel,'saveChapter',{number:1,title:'Draft',markdown:'Next revision'});
  const histories = fs.readdirSync(path.join(directory,'novels',novel.id,'history')).map(file => JSON.parse(fs.readFileSync(path.join(directory,'novels',novel.id,'history',file),'utf8')));
  assert.ok(histories.some(old => old.chapters.some((chapter: { contentFile:string }) => readMarkdown(novel.id,chapter.contentFile) === 'Edited in a text editor')));
});

test('interrupted transaction rolls forward from its plain-text journal', () => {
  let novel = mutate(create(), 'createChapter', { title:'Before' });
  const stored = readNovel(novel.id)!;
  stored.chapters[0].title = 'After';
  fs.writeFileSync(path.join(directory,'novels',novel.id,'.pending.json'), JSON.stringify({novel:stored,writes:[{file:'chapter-1.md',markdown:'Recovered text'}]}));
  novel = workspaceNovel(novel.id);
  assert.equal(novel.chapters[0].title,'After');
  assert.equal(novel.chapters[0].markdown,'Recovered text');
  assert.equal(fs.existsSync(path.join(directory,'novels',novel.id,'.pending.json')),false);
});

test('legacy files remain readable and their publication is frozen before a CMS edit', () => {
  fs.mkdirSync(path.join(directory,'novels','legacy'),{recursive:true});
  fs.writeFileSync(path.join(directory,'novels','legacy','index.json'),JSON.stringify({title:'Legacy',author:'Writer',genre:'Novel',description:'',date:'2026-01-01',status:'ongoing',chapters:[{number:1,title:'Original'}]}));
  fs.writeFileSync(path.join(directory,'novels','legacy','chapter-1.md'),'Original text');
  let novel = workspaceNovel('legacy');
  assert.equal(novel.publication,'published');
  novel = mutate(novel,'saveChapter',{number:1,title:'Draft title',markdown:'Working text'});
  assert.equal(readMarkdown('legacy',novel.chapters[0].published!.contentFile),'Original text');
});

test('invalid order, content paths, symlinks and duplicate chapter IDs are rejected', () => {
  const novel = mutate(create(),'createChapter',{title:'Chapter'});
  assert.throws(() => mutate(novel,'reorder',{order:[1,1]}),/every chapter/);
  assert.throws(() => workspaceNovel('../escape'),/novel ID/);
  fs.symlinkSync(path.join(directory,'novels',novel.id,'index.json'),path.join(directory,'novels',novel.id,'chapter-2.md'));
  assert.throws(() => readMarkdown(novel.id,'chapter-2.md'),/symbolic links/);
  const stored = readNovel(novel.id)!;
  stored.chapters.push(stored.chapters[0]);
  fs.writeFileSync(path.join(directory,'novels',novel.id,'index.json'),JSON.stringify(stored));
  assert.throws(() => readNovel(novel.id),/unique positive/);
});

test('empty library and harmless files are supported; broken metadata reports its location', () => {
  assert.deepEqual(listNovels(),[]);
  const novel = create();
  fs.writeFileSync(path.join(directory,'novels','.DS_Store'),'metadata');
  assert.equal(listNovels().length,1);
  fs.writeFileSync(path.join(directory,'novels',novel.id,'index.json'),'{invalid');
  assert.throws(() => listNovels(),new RegExp(novel.id + '/index.json'));
});

test('preview renderer removes executable HTML and unsafe links', async () => {
  const html = await renderMarkdown('# Hello\n\n<script>alert(1)</script>\n\n[Bad](javascript:alert%281%29)');
  assert.match(html,/<h1>Hello<\/h1>/);
  assert.doesNotMatch(html,/<script|href="javascript:/i);
});


test('adding a chapter never overwrites an unindexed hand-written Markdown file', () => {
  let novel = create();
  const file = path.join(directory,'novels',novel.id,'chapter-1.md');
  fs.writeFileSync(file,'An unindexed manuscript');
  novel = mutate(novel,'createChapter',{title:'New chapter'});
  assert.equal(novel.chapters[0].number,2);
  assert.equal(fs.readFileSync(file,'utf8'),'An unindexed manuscript');
});


test('novel details can be edited without changing chapter text or publication', () => {
  let novel = mutate(create(), 'createChapter', { title:'First chapter' });
  novel = mutate(novel, 'saveChapter', { number:1, title:'First chapter', markdown:'Keep this manuscript' });
  novel = mutate(novel, 'publishChapter', { number:1 });
  const published = novel.chapters[0].published;
  novel = mutate(novel, 'updateNovel', { title:'New title', author:'New author', genreKey:'Mystery', description:'A new description', status:'completed' });
  assert.equal(novel.title,'New title');
  assert.equal(novel.genre,'Mystery');
  assert.equal(novel.status,'completed');
  assert.equal(novel.chapters[0].markdown,'Keep this manuscript');
  assert.deepEqual(novel.chapters[0].published,published);
});

test('genres can be created and renamed without rewriting novels or changing their membership', () => {
  let genres = listGenres();
  genres = mutateGenres({ action:'createGenre', name:'Fantasy', revision:genres.revision });
  const novel = mutateContent({ action:'createNovel', title:'A fantasy', author:'Writer', genreKey:'Fantasy' });
  const file = path.join(directory,'novels',novel.id,'index.json');
  const before = fs.readFileSync(file,'utf8');
  const stale = genres.revision;
  genres = mutateGenres({ action:'renameGenre', genreId:'Fantasy', name:'Speculative fiction', revision:genres.revision });
  assert.equal(readNovel(novel.id)!.genre,'Speculative fiction');
  assert.equal(readNovel(novel.id)!.genreKey,'Fantasy');
  assert.equal(fs.readFileSync(file,'utf8'),before);
  assert.throws(() => mutateGenres({ action:'createGenre',name:'Other',revision:stale }), /Genres changed/);
  assert.throws(() => mutateGenres({ action:'createGenre',name:'SPECULATIVE FICTION',revision:genres.revision }), /already exists/);
  const updated = mutate(workspaceNovel(novel.id),'updateNovel',{title:'A fantasy',author:'Writer',genreKey:'Fantasy',description:'',status:'ongoing'});
  genres = mutateGenres({action:'renameGenre',genreId:'Fantasy',name:'Fantasy again',revision:genres.revision});
  assert.equal(readNovel(updated.id)!.genre,'Fantasy again');
});
