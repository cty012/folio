import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mutateContent, workspaceNovel, listNovels, readNovel, readMarkdown, listGenres, mutateGenres, deleteNovel } from '../src/lib/content-store.ts';
import { renderMarkdown } from '../src/lib/markdown.ts';
import { bookView } from '../src/lib/book-view.ts';
import type { WorkspaceNovel } from '../src/lib/definitions.ts';
import { chapterOrder, contentsOf, filterContents } from '../src/lib/contents.ts';
import type { ChapterEntry, Volume } from '../src/lib/definitions.ts';

const ref = (number: number): ChapterEntry => ({type:'chapter',number});
const volume = (id: string, numbers: number[]): Volume => ({type:'volume',id,title:id,description:'Volume description',chapters:numbers.map(ref)});

let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-test-')); process.env.FOLIO_DATA_DIR = directory; });
afterEach(() => { delete process.env.FOLIO_DATA_DIR; fs.rmSync(directory, { recursive: true, force: true }); });
const create = () => mutateContent({ action:'createNovel', title:'Test manuscript', author:'Writer' });
const mutate = (novel: WorkspaceNovel, action: string, extra: object = {}) => mutateContent({ id:novel.id, revision:novel.revision, action, ...extra });

test('legacy organization remains untouched until explicitly saved, with a recoverable prior index', () => {
  let novel = mutate(create(),'createChapter',{title:'First'});
  const file = path.join(directory,'novels',novel.id,'index.json');
  const before = fs.readFileSync(file,'utf8');
  assert.deepEqual(contentsOf(workspaceNovel(novel.id)),[ref(1)]);
  assert.equal(fs.readFileSync(file,'utf8'),before);
  novel = mutate(novel,'saveChapter',{number:1,title:'First',markdown:'Unchanged manuscript'});
  assert.equal(JSON.parse(fs.readFileSync(file,'utf8')).contents,undefined);
  novel = mutate(novel,'publishChapter',{number:1});
  const published = novel.chapters[0].published;
  novel = mutate(novel,'updateContents',{contents:[volume('part-one',[1])]});
  assert.equal(novel.chapters[0].markdown,'Unchanged manuscript');
  assert.deepEqual(novel.chapters[0].published,published);
  const history = path.join(directory,'novels',novel.id,'history');
  assert.ok(fs.readdirSync(history).some(file => {
    const old = JSON.parse(fs.readFileSync(path.join(history,file),'utf8'));
    return !old.contents && old.chapters[0]?.published;
  }));
});

test('mixed root chapters and volumes flatten in order, preserving stable chapter identities', () => {
  let novel = create();
  for (let i=1;i<=7;i++) novel = mutate(novel,'createChapter',{title:`Chapter ${i}`});
  novel = mutate(novel,'updateContents',{contents:[ref(1),volume('v1',[2,3,4]),ref(5),ref(6),volume('v2',[7])]});
  assert.deepEqual(novel.chapters.map(c=>c.number),[1,2,3,4,5,6,7]);
  novel = mutate(novel,'updateContents',{contents:[volume('v2',[7]),ref(1),volume('v1',[2,3,4]),ref(5),ref(6)]});
  assert.deepEqual(novel.chapters.map(c=>c.number),[7,1,2,3,4,5,6]);
  novel = mutate(novel,'updateContents',{contents:[volume('v2',[7,3]),ref(1),volume('v1',[2,4]),ref(5),ref(6)]});
  assert.deepEqual(novel.chapters.map(c=>c.number),[7,3,1,2,4,5,6]);
  novel = mutate(novel,'updateContents',{contents:[ref(7),ref(3),ref(1),volume('v1',[2,4]),ref(5),ref(6)]});
  assert.deepEqual(novel.chapters.map(c=>c.number),[7,3,1,2,4,5,6]);
  assert.deepEqual(novel.chapters.map(c=>c.contentFile),[7,3,1,2,4,5,6].map(n=>`chapter-${n}.md`));
  assert.throws(()=>mutate(novel,'reorder',{order:[1,2,3,4,5,6,7]}),/organizer/);
});

test('invalid volume trees never partially write metadata', () => {
  let novel = mutate(create(),'createChapter',{title:'First'});
  novel = mutate(novel,'createChapter',{title:'Second'});
  const file = path.join(directory,'novels',novel.id,'index.json');
  const before = fs.readFileSync(file,'utf8');
  for (const contents of [null, [], [ref(1)], [ref(1),ref(1)], [ref(1),ref(3)],
    [volume('empty',[]),ref(1),ref(2)], [volume('same',[1]),volume('same',[2])],
    [{...volume('nested',[1]),chapters:[volume('child',[1])]},ref(2)],
    [{...volume('blank',[1]),title:'  '},ref(2)], [volume('../invalid',[1]),ref(2)]]) {
    assert.throws(()=>mutate(novel,'updateContents',{contents}));
    assert.equal(fs.readFileSync(file,'utf8'),before);
  }
});

test('chapters can be created in volumes and deleting their final chapter removes the volume', () => {
  let novel = mutate(create(),'createChapter',{title:'First',newVolumeTitle:'Part one'});
  const id = (novel.contents![0] as Volume).id;
  novel = mutate(novel,'createChapter',{title:'Root'});
  novel = mutate(novel,'createChapter',{title:'In volume',volumeId:id});
  assert.deepEqual(novel.chapters.map(c=>c.number),[1,3,2]);
  assert.throws(()=>mutate(novel,'createChapter',{title:'Missing',volumeId:'missing'}),/Volume not found/);
  novel = mutate(novel,'publishChapter',{number:1});
  novel = mutate(novel,'deleteChapter',{number:3});
  assert.deepEqual(chapterOrder(novel.contents!),[1,2]);
  novel = mutate(novel,'deleteChapter',{number:1});
  assert.deepEqual(novel.contents,[ref(2)]);
  assert.equal(novel.publication,'draft');
  assert.equal(readMarkdown(novel.id,'chapter-1.md'),'');
});

test('manual volume edits reject stale saves and interrupted organization saves recover', () => {
  let novel = mutate(create(),'createChapter',{title:'First'});
  novel = mutate(novel,'createChapter',{title:'Second'});
  const stored = readNovel(novel.id)!;
  stored.contents = [volume('manual',[2,1])];
  const folder = path.join(directory,'novels',novel.id);
  fs.writeFileSync(path.join(folder,'index.json'),JSON.stringify(stored));
  assert.throws(()=>mutate(novel,'updateContents',{contents:[ref(1),ref(2)]}),/changed in another tab/);
  assert.deepEqual(workspaceNovel(novel.id).chapters.map(c=>c.number),[2,1]);
  stored.contents = [ref(2),ref(1)];
  fs.writeFileSync(path.join(folder,'.pending.json'),JSON.stringify({novel:stored,writes:[]}));
  assert.deepEqual(workspaceNovel(novel.id).contents,[ref(2),ref(1)]);
  assert.equal(fs.existsSync(path.join(folder,'.pending.json')),false);
});

test('public contents omit draft-only volumes and preserve the published reading order', () => {
  const tree = [ref(1),volume('mixed',[2,3,4]),volume('private',[5]),ref(6)];
  const filtered = filterContents(tree,new Set([1,3,4,6]));
  assert.deepEqual(filtered,[ref(1),volume('mixed',[3,4]),ref(6)]);
  assert.deepEqual(chapterOrder(filtered),[1,3,4,6]);
  assert.deepEqual(tree[2],volume('private',[5]));
});

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

test('chapters report when their saved draft differs from the published version', () => {
  let novel = mutate(create(), 'createChapter', { title:'First' });
  novel = mutate(novel, 'saveChapter', { number:1, title:'First', markdown:'Original text' });
  assert.equal(novel.chapters[0].unpublishedChanges, false, 'never published is not "changed"');
  novel = mutate(novel, 'publishChapter', { number:1 });
  assert.equal(novel.chapters[0].unpublishedChanges, false);
  novel = mutate(novel, 'saveChapter', { number:1, title:'First', markdown:'Revised text' });
  assert.equal(novel.chapters[0].unpublishedChanges, true);
  // Saving the published text again clears the flag; so does a new publication.
  novel = mutate(novel, 'saveChapter', { number:1, title:'First', markdown:'Original text' });
  assert.equal(novel.chapters[0].unpublishedChanges, false);
  novel = mutate(novel, 'saveChapter', { number:1, title:'Renamed', markdown:'Original text' });
  assert.equal(novel.chapters[0].unpublishedChanges, true, 'a title change alone counts');
  novel = mutate(novel, 'publishChapter', { number:1 });
  assert.equal(novel.chapters[0].unpublishedChanges, false);
  assert.deepEqual(bookView(novel).chapters.map(chapter => chapter.state), ['published']);
  novel = mutate(novel, 'saveChapter', { number:1, title:'Renamed', markdown:'Third text' });
  assert.deepEqual(bookView(novel).chapters.map(chapter => chapter.state), ['revised']);
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
  assert.deepEqual(novel.characters, []);
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

test('character profiles round-trip, reorder, edit and remove without changing chapter publication', () => {
  let novel = mutate(create(), 'createChapter', { title:'First chapter' });
  novel = mutate(novel, 'saveChapter', { number:1, title:'First chapter', markdown:'A retained manuscript' });
  novel = mutate(novel, 'publishChapter', { number:1 });
  const chapter = novel.chapters[0];
  const mara = { id:'mara', name:'Mara Vale', role:'Cartographer', introduction:'A mapmaker.\nShe carries a blank atlas.' };
  const ivo = { id:'ivo', name:'Ivo Reed', role:'Courier', introduction:'He remembers every road.' };
  novel = mutate(novel, 'updateCharacters', { characters:[mara, ivo] });
  const index = path.join(directory,'novels',novel.id,'index.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(index,'utf8')).characters, [mara, ivo]);
  assert.deepEqual(workspaceNovel(novel.id).characters, [mara, ivo]);
  novel = mutate(novel, 'updateCharacters', { characters:[ivo, {...mara, role:'Explorer'}] });
  novel = mutate(novel, 'updateNovel', { title:novel.title, author:novel.author, description:'Updated synopsis', status:'ongoing' });
  assert.deepEqual(novel.characters, [ivo, {...mara, role:'Explorer'}]);
  assert.deepEqual(novel.chapters[0], chapter);
  assert.equal(novel.publication, 'published');
  novel = mutate(novel, 'updateCharacters', { characters:[] });
  assert.deepEqual(workspaceNovel(novel.id).characters, []);
  const histories = fs.readdirSync(path.join(directory,'novels',novel.id,'history')).map(file => JSON.parse(fs.readFileSync(path.join(directory,'novels',novel.id,'history',file),'utf8')));
  assert.ok(histories.some(old => old.characters?.[0]?.name === 'Mara Vale'));
});

test('manual character edits load and reject stale CMS writes', () => {
  let novel = create();
  const file = path.join(directory,'novels',novel.id,'index.json');
  const stored = JSON.parse(fs.readFileSync(file,'utf8'));
  stored.characters = [{ name:'Manual character' }];
  fs.writeFileSync(file,JSON.stringify(stored));
  assert.throws(() => mutate(novel,'updateCharacters',{characters:[]}), /changed in another tab/);
  novel = workspaceNovel(novel.id);
  assert.deepEqual(novel.characters,[{id:'character-1',name:'Manual character',role:'',introduction:''}]);
  assert.equal(novel.publication,'draft');
});

test('character categories group profiles in their saved order', () => {
  let novel = create();
  const characters = [
    { id:'mara', name:'Mara Vale', role:'', introduction:'', category:'Crew' },
    { id:'ivo', name:'Ivo Reed', role:'', introduction:'' },
    { id:'sable', name:'Sable', role:'', introduction:'', category:'Rivals' },
  ];
  novel = mutate(novel, 'updateCharacters', { characters, categories:['Rivals','Empty group','Crew'] });
  assert.deepEqual(novel.characterCategories, ['Rivals','Empty group','Crew']);
  assert.deepEqual(novel.characters!.map(character => character.category), ['Crew', undefined, 'Rivals']);
  // Categories used by a profile but missing from the list are appended; omitted lists are kept.
  novel = mutate(novel, 'updateCharacters', { characters:[...characters, { id:'lio', name:'Lio', role:'', introduction:'', category:'Townsfolk' }] });
  assert.deepEqual(novel.characterCategories, ['Rivals','Empty group','Crew','Townsfolk']);
  novel = mutate(novel, 'updateCharacters', { characters:characters.map(({ category: _, ...character }) => character), categories:[] });
  assert.equal(novel.characterCategories, undefined);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory,'novels',novel.id,'index.json'),'utf8')).characterCategories, undefined);
  for (const categories of [['Same','Same'], ['   '], ['x'.repeat(101)], Array.from({ length:51 }, (_, index) => `Group ${index}`), 'Crew'])
    assert.throws(() => mutate(novel, 'updateCharacters', { characters, categories }));
});

test('relationships connect existing characters and follow removals', () => {
  let novel = create();
  const characters = [
    { id:'mara', name:'Mara Vale', role:'', introduction:'' },
    { id:'ivo', name:'Ivo Reed', role:'', introduction:'' },
    { id:'sable', name:'Sable', role:'', introduction:'' },
  ];
  const relations = [{ from:'mara', to:'ivo', label:'mentor' }, { from:'ivo', to:'sable', label:'rivals', mutual:true }];
  novel = mutate(novel, 'updateCharacters', { characters, relations });
  assert.deepEqual(novel.characterRelations, relations);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,'novels',novel.id,'index.json'),'utf8')).characterRelations, relations);
  // Editing profiles without sending relationships keeps them.
  novel = mutate(novel, 'updateCharacters', { characters:[characters[1], characters[0], characters[2]] });
  assert.deepEqual(novel.characterRelations, relations);
  // Removing a character drops only the relationships that involve it.
  novel = mutate(novel, 'updateCharacters', { characters:[characters[0], characters[1]] });
  assert.deepEqual(novel.characterRelations, [relations[0]]);
  const before = fs.readFileSync(path.join(directory,'novels',novel.id,'index.json'),'utf8');
  for (const invalid of [
    [{ from:'mara', to:'nobody', label:'friend' }], [{ from:'mara', to:'mara', label:'self' }],
    [{ from:'mara', to:'ivo', label:'   ' }], [{ from:'mara', to:'ivo', label:'x'.repeat(61) }],
    [{ from:'mara', to:'ivo', label:'friend', mutual:'yes' }], {},
  ]) {
    assert.throws(() => mutate(novel, 'updateCharacters', { characters:[characters[0], characters[1]], relations:invalid }));
    assert.equal(fs.readFileSync(path.join(directory,'novels',novel.id,'index.json'),'utf8'), before);
  }
  assert.throws(() => mutate(novel, 'updateCharacters', { characters:[characters[0], { ...characters[1], id:'mara' }] }), /unique/);
  assert.throws(() => mutate(novel, 'updateCharacters', { characters:[{ ...characters[0], id:'../escape' }] }), /character ID/);
});

test('hand-written profiles without IDs get stable IDs that avoid explicit ones', () => {
  const novel = create();
  const file = path.join(directory,'novels',novel.id,'index.json');
  const stored = JSON.parse(fs.readFileSync(file,'utf8'));
  stored.characters = [{ name:'First' }, { id:'character-2', name:'Second' }, { name:'Third' }];
  stored.characterRelations = [{ from:'character-1', to:'character-2', label:'sibling', mutual:true }];
  fs.writeFileSync(file,JSON.stringify(stored));
  const loaded = workspaceNovel(novel.id);
  assert.deepEqual(loaded.characters!.map(character => character.id), ['character-1','character-2','character-3']);
  assert.equal(loaded.revision, workspaceNovel(novel.id).revision);
  assert.deepEqual(loaded.characterRelations, [{ from:'character-1', to:'character-2', label:'sibling', mutual:true }]);
});

test('invalid character profiles cannot partially overwrite metadata', () => {
  const novel = mutate(create(), 'updateCharacters', { characters:[{name:'Existing character'}] });
  const file = path.join(directory,'novels',novel.id,'index.json');
  const before = fs.readFileSync(file,'utf8');
  for (const characters of [null, {}, [{name:'   '}], [{name:'x',role:42}], [{name:'x',introduction:'x'.repeat(10001)}], Array(101).fill({name:'x'})]) {
    assert.throws(() => mutate(novel,'updateCharacters',{characters}));
    assert.equal(fs.readFileSync(file,'utf8'), before);
  }
});

test('chapter deletion retains recoverable text and history, updates publication, and never reuses the route', () => {
  let novel = mutate(create(),'createChapter',{title:'Published'});
  novel = mutate(novel,'saveChapter',{number:1,title:'Published',markdown:'Published words'});
  novel = mutate(novel,'publishChapter',{number:1});
  novel = mutate(novel,'saveChapter',{number:1,title:'Working title',markdown:'Unsynced working words'});
  const removed = novel.chapters[0];
  novel = mutate(novel,'deleteChapter',{number:1});
  assert.deepEqual(novel.chapters,[]);
  assert.equal(novel.publication,'draft');
  assert.equal(readMarkdown(novel.id,'chapter-1.md'),'Unsynced working words');
  assert.equal(readMarkdown(novel.id,removed.published!.contentFile),'Published words');
  const history = fs.readdirSync(path.join(directory,'novels',novel.id,'history')).map(file=>JSON.parse(fs.readFileSync(path.join(directory,'novels',novel.id,'history',file),'utf8')));
  assert.ok(history.some(old=>old.chapters.some((chapter: {title:string})=>chapter.title==='Working title')));
  novel = mutate(novel,'createChapter',{title:'Next'});
  assert.equal(novel.chapters[0].number,2);
  const before = novel.revision;
  assert.throws(()=>mutate(novel,'deleteChapter',{number:1}),/Chapter not found/);
  assert.equal(workspaceNovel(novel.id).revision,before);
});

test('deleting a draft keeps other published chapters and rejects stale requests', () => {
  let novel = mutate(create(),'createChapter',{title:'Keep'});
  novel = mutate(novel,'publishChapter',{number:1});
  const stale = novel;
  novel = mutate(novel,'createChapter',{title:'Remove'});
  assert.throws(()=>mutate(stale,'deleteChapter',{number:1}),/changed in another tab/);
  novel = mutate(novel,'deleteChapter',{number:2});
  assert.equal(novel.publication,'published');
  assert.deepEqual(novel.chapters.map(chapter=>chapter.number),[1]);
});

test('deleting a snapshot-only chapter reserves its ID and journal recovery completes the removal', () => {
  let novel = mutate(create(),'createChapter',{title:'Snapshot only'});
  novel = mutate(novel,'publishChapter',{number:1});
  const stored = readNovel(novel.id)!;
  stored.chapters[0].contentFile = stored.chapters[0].published!.contentFile;
  const folder = path.join(directory,'novels',novel.id);
  fs.writeFileSync(path.join(folder,'index.json'),JSON.stringify(stored));
  fs.unlinkSync(path.join(folder,'chapter-1.md'));
  novel = mutate(workspaceNovel(novel.id),'deleteChapter',{number:1});
  assert.ok(fs.existsSync(path.join(folder,'chapter-1.md')));
  // A durable deletion journal must recover the index and retained working file together.
  fs.writeFileSync(path.join(folder,'.pending.json'),JSON.stringify({novel:readNovel(novel.id),writes:[{file:'chapter-1.md',markdown:'Recovered deleted text'}]}));
  assert.deepEqual(workspaceNovel(novel.id).chapters,[]);
  assert.equal(readMarkdown(novel.id,'chapter-1.md'),'Recovered deleted text');
  novel = mutate(workspaceNovel(novel.id),'createChapter',{title:'New'});
  assert.equal(novel.chapters[0].number,2);
});

test('novel deletion archives the complete folder and supports manual recovery', () => {
  let novel = mutate(create(),'createChapter',{title:'Keep every file'});
  novel = mutate(novel,'saveChapter',{number:1,title:'Keep every file',markdown:'Retain this text'});
  novel = mutate(novel,'publishChapter',{number:1});
  const folder = path.join(directory,'novels',novel.id);
  fs.writeFileSync(path.join(folder,'notes.txt'),'Unindexed author notes');
  const snapshot = (folder: string): [string,Buffer][] => fs.readdirSync(folder,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?snapshot(path.join(folder,entry.name)).map(([file,bytes])=>[entry.name+'/'+file,bytes] as [string,Buffer]):[[entry.name,fs.readFileSync(path.join(folder,entry.name))] as [string,Buffer]]);
  const before = snapshot(folder);
  assert.deepEqual(deleteNovel({id:novel.id,revision:novel.revision}),{deleted:true,id:novel.id});
  assert.equal(readNovel(novel.id),undefined);
  assert.deepEqual(listNovels(),[]);
  const trash = path.join(directory,'.trash','novels');
  const archive = path.join(trash,fs.readdirSync(trash)[0]);
  assert.deepEqual(snapshot(archive),before);
  assert.throws(()=>deleteNovel({id:novel.id,revision:novel.revision}),/Novel not found/);
  fs.renameSync(archive,folder);
  assert.deepEqual(workspaceNovel(novel.id),novel);
});

test('novel deletion checks revisions, locks, and trash symlinks before moving content', () => {
  let novel = create();
  assert.throws(()=>deleteNovel({id:novel.id,revision:'stale'}),/changed in another tab/);
  const lock = path.join(directory,'novels',novel.id,'.write-lock');
  fs.mkdirSync(lock);
  assert.throws(()=>deleteNovel({id:novel.id,revision:novel.revision}),/being saved/);
  fs.rmdirSync(lock);
  fs.symlinkSync(path.join(directory,'novels'),path.join(directory,'.trash'));
  assert.throws(()=>deleteNovel({id:novel.id,revision:novel.revision}),/symbolic links/);
  assert.ok(readNovel(novel.id));
  assert.equal(fs.existsSync(lock),false);
});

test('word counts track drafts and published snapshots independently without persisting counts', () => {
  let novel = mutate(create(), 'createChapter', { title:'A title is not chapter text' });
  assert.equal(novel.chapters[0].wordCount, 0);
  assert.equal(novel.chapters[0].publishedWordCount, null);
  novel = mutate(novel,'saveChapter',{number:1,title:'Chapter',markdown:'Hello **world**!'});
  novel = mutate(novel,'publishChapter',{number:1});
  novel = mutate(novel,'saveChapter',{number:1,title:'Chapter',markdown:'你好，世界！ A new draft.'});
  assert.equal(novel.chapters[0].wordCount, 7);
  assert.equal(novel.chapters[0].publishedWordCount, 2);
  const file = path.join(directory,'novels',novel.id,'index.json');
  assert.equal(fs.readFileSync(file,'utf8').includes('wordCount'), false);
  fs.writeFileSync(path.join(directory,'novels',novel.id,'chapter-1.md'),'External edit');
  novel = workspaceNovel(novel.id);
  assert.equal(novel.chapters[0].wordCount, 2);
  assert.equal(novel.chapters[0].publishedWordCount, 2);
});
