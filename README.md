# Folio

A local writing workspace and a static novel reader. Manuscripts stay in plain-text Markdown and JSON, with no database or account required.

## Run the writing workspace

Use Node.js 22.18 or newer, then:

```sh
npm install
npm run dev:cms
```

Open the local URL printed by the server. Reading and writing use the same pages:

- **Library:** create novels, edit each novel’s details, and add or rename genres beside the genre list. Search, filter, group, and sort your collection. Each novel gets a typographic cover generated from its title and author; its colour and layout follow the novel’s ID, so they stay the same when you rename it.
- **Novel page:** edit its title, author, description, genre, and status. The **Contents** tab shows one volume at a time, chosen from the list of volumes beside it; **Find a chapter** searches every chapter by title or number. Add chapters, and arrange them with **Organize chapters & volumes**. **Characters** and **Relationships** have tabs of their own (see below). In each browser, the page remembers the last chapter you opened and offers **Continue reading**.
- **Chapter page:** the novel's contents stay beside the text and fit the window; in novels with more than 40 chapters only the current volume starts expanded. Read the working manuscript, choose **Edit chapter** to write in place, and save with **Save draft** or **⌘S / Ctrl+S**. **Preview** renders unsaved Markdown in the same reading surface. You can also inspect the published version here.

The local build includes both drafts and published work in this navigation. Static exports use the same visual design and omit editing controls and unpublished content. The old `/studio/` URL redirects to the library.

Save before leaving a chapter. Unsaved text is kept as a browser recovery copy when browser storage is available; after reopening the chapter, choose **Restore text**. Disk saves are explicit, not automatic.

**Publish chapter** captures the saved text and title as a separate snapshot and makes the novel eligible for static export. Later edits remain drafts until you publish another saved revision. When a published chapter's saved title or text differs from its snapshot, the chapter toolbar shows **Unpublished changes** with a switch between the working draft and the published version, and the novel's contents and the chapter list beside the text mark it **Edited**. Otherwise the toolbar shows **Same as published** and **Publish revision** is unavailable. Unsaved typing is not compared until you save it. **Unpublish**, in the chapter toolbar’s **⋯** menu, excludes a chapter from future exports; it stays available locally and is not removed from an already deployed site. Rebuild and replace that site's files to update it.

For a production local CMS:

```sh
npm run build:cms
npm run start:cms
```

The CMS binds to this computer (`127.0.0.1`). Write requests require a matching local Origin and JSON content type. It is designed for a single trusted local user; do not expose it through a public proxy.

## Appearance

The **Aa** button in the header sets the theme (follow the system, light, or dark) and the reading text size. It is available in both the writing workspace and static exports. These choices are stored in the browser, not in your content folder, so each reader and each device keeps its own.

## Build the static reader

```sh
npm run build:static
npm run preview:static
```

The export is in `out/`; preview it at http://127.0.0.1:4173. Only published novels and published chapter snapshots are exported. The writing workspace, write API, working draft text, history, and content-folder files are excluded. Chapter URLs work directly on ordinary static hosts because the export uses directory-style URLs.

Deploy only `out/`, never your content folder. Rebuild after publishing or changing order. Replace the previous deployment rather than adding files over it, so unpublished pages do not remain online.

`npm run dev` aliases `dev:cms`, `npm run build` aliases `build:static`, and `npm start` aliases `start:cms`. The build mode is controlled by `FOLIO_MODE=cms|static`; the scripts set it for you. Development, CMS production, and static builds use separate Next.js output directories.

## Edit files directly

Your working manuscript uses predictable paths:

```text
data/
├── settings.json
├── locales/
└── novels/
    └── my-novel-abc12345/
        ├── index.json
        ├── chapter-1.md       # working draft; edit in any text editor
        ├── chapter-2.md
        ├── revisions/         # immutable published/backup Markdown snapshots
        │   └── <content-hash>.md
        └── history/           # previous indexes referring to saved snapshots
            └── <timestamp>-<id>.json
```

Open `chapter-N.md` in any text editor. Edit titles and reading order in `index.json`. The `number` is a stable chapter identity used in filenames and URLs; reading order comes from `contents` when present, otherwise the `chapters` array. Don't renumber chapters when reordering them.

In the chapter editor, **Reload from disk** loads your external edits. If a file changes after the CMS loads it, a stale save is rejected so it cannot silently overwrite the external version. Copy your unsaved editor text before reloading to resolve a conflict.

A new novel's index looks like this (IDs must use letters, numbers, hyphens or underscores):

```json
{
  "id": "my-novel",
  "title": "My Novel",
  "author": "Your Name",
  "genre": "Fantasy",
  "description": "",
  "date": "2026-09-06",
  "status": "ongoing",
  "publication": "draft",
  "chapters": [
    {
      "number": 1,
      "title": "The Beginning",
      "contentFile": "chapter-1.md",
      "published": null
    }
  ]
}
```

For fully manual publication, set `publication` to `published` and set a chapter's `published` value to `{"title":"The Beginning","contentFile":"chapter-1.md"}`. This uses that working file at build time. To freeze a manually published revision, copy the Markdown into `revisions/` under a hexadecimal filename, such as `abcdef.md`, and reference `revisions/abcdef.md` instead. The CMS creates content-hash snapshots automatically. Leave those snapshots unchanged to preserve publication and history.

Existing Folio indexes without publication fields retain their original behavior: novels and chapters are published, using their `chapter-N.md` files. Opening them does not rewrite them. The first local save of a published chapter freezes its prior published text before changing the working draft.

Use a different content folder with an absolute path:

```sh
FOLIO_DATA_DIR=/absolute/path/to/my-library npm run dev:cms
FOLIO_DATA_DIR=/absolute/path/to/my-library npm run build:static
FOLIO_DATA_DIR=/absolute/path/to/my-library npm run start:cms
```

Set the same folder for every command that should use that library. `FOLIO_DATA_DIR` contains `novels/`; UI settings and translations currently remain in the application's `data/settings.json` and `data/locales/`. Browser recovery copies belong to this browser and origin; disk files are the authoritative manuscript.

## Volumes and chapter order

On a novel’s info page, choose **Organize chapters & volumes**. Create a volume around a standalone chapter, move other chapters into it using their location menus, and use the arrows to reorder chapters or entire volumes. Edit volume titles and descriptions there, then **Save changes**. **Ungroup volume** keeps its chapters in the same position. In **New chapter**, choose a standalone chapter, an existing volume, or a new volume containing that first chapter.

A novel can mix standalone chapters and volumes. Volumes contain chapters only and must have at least one; moving or deleting their last chapter removes the empty volume, with a warning before proceeding. Chapter numbers run continuously across the whole reading order, and previous/next navigation crosses volume boundaries. Stable chapter IDs, filenames, and links do not change when you move them.

**Existing novels need no migration.** Flat indexes load as before, without being rewritten. Organizing them adds an optional `contents` array beside the existing `chapters` metadata; the previous index is backed up in `history/`. A plain-text example for `c1, v1(c2,c3,c4), c5, c6, v2(c7)` is:

```json
"contents": [
  { "type": "chapter", "number": 1 },
  {
    "type": "volume", "id": "v1", "title": "Part One", "description": "",
    "chapters": [
      { "type": "chapter", "number": 2 },
      { "type": "chapter", "number": 3 },
      { "type": "chapter", "number": 4 }
    ]
  },
  { "type": "chapter", "number": 5 },
  { "type": "chapter", "number": 6 },
  {
    "type": "volume", "id": "v2", "title": "Part Two", "description": "",
    "chapters": [{ "type": "chapter", "number": 7 }]
  }
]
```

Every chapter in `chapters` must appear exactly once in `contents`. Volume IDs must be unique and use letters, numbers, hyphens, or underscores. Titles are required (up to 200 characters); descriptions are optional plain text (up to 10,000 characters). Do not nest volumes. Edit the tree to reorder or regroup chapters; editing only the metadata array order has no effect when `contents` exists.

Static exports retain only published chapters, omit volumes with no published chapters, and number the remaining chapters continuously. Volume titles, descriptions, and organization are reader-facing metadata: changes appear on the next build without a separate publish step, like the novel synopsis. A volume containing published work is not a place for private notes.

## Tables

Reading pages, CMS previews, and static exports support standard [GitHub-flavored Markdown tables](https://github.com/remarkjs/remark-gfm):

```markdown
| Item | Packed by | Quantity |
| :--- | :---: | ---: |
| **Maps** | Mara | 3 |
| Compass | Ivo | 1 |
```

Colons set left (`:---`), center (`:---:`), or right (`---:`) alignment. Use a header and separator row with matching numbers of columns. Cells support inline formatting, links, code, and `$math$`; escape literal pipes with `\|`. Each row must stay on one line; merged cells and block content are not supported. Wide tables scroll horizontally, including with the keyboard when the table container is focused.

Table text contributes to chapter word counts; separators and formulas do not. See **Formatting Examples → Tables in a Chapter** for working examples. The GFM parser also enables strikethrough, task lists, autolinks, and footnotes.

## Math with KaTeX

Use `$E = mc^2$` for inline math. For a centered display equation, put `$$` on separate lines:

```markdown
$$
\frac{a}{b} + \sqrt{c} = \sum_{n=1}^{N} n
$$
```

Fenced blocks with the `math` language also render as display equations. Ordinary code spans and other code blocks stay literal. Escape dollar signs in prices (`\$5`) so they aren't interpreted as math delimiters. KaTeX supports a subset of LaTeX, not full LaTeX documents; malformed expressions display their source in an error style instead of breaking the chapter.

Reading pages, draft previews, published snapshots, and static exports all use the same renderer. Styles and fonts are bundled locally, so formulas work offline. Wide display equations scroll horizontally. Raw HTML remains disabled, and math commands that load remote resources or inject HTML are not trusted.

See **Formatting Examples → Math in a Chapter** in the bundled library for working examples. The renderer uses the [remark math plugins](https://github.com/remarkjs/remark-math) with [KaTeX](https://katex.org/docs/supported.html). The npm `katex` override keeps the renderer, math parser, and local stylesheet on the same current release instead of the plugins' older transitive version range.

## Chapter word counts

Each chapter shows its count in the novel's chapter list and on its reading page. The editor updates the count as you type. Counts come from the chapter body, excluding the separate title, Markdown formatting, image labels, raw HTML, and link destinations. Text in Markdown headings and code blocks is included. Each Han character counts as one; other letter/number groups count as words, with internal apostrophes and hyphens kept together.

Math formulas (including `math` code blocks) are excluded from word counts. The local CMS counts working drafts. Switching to the published version shows that snapshot's count, and static exports count only published text. Counts are calculated automatically; no extra fields or migration are needed in your content files.

## Delete chapters and novels

In the local CMS:

- **Chapter:** point at it in the novel's contents and click its trash button, or use **Delete chapter** in the chapter toolbar’s **⋯** menu (the only way on touch screens). Save or discard unsaved text and resolve browser recovery drafts first when deleting from the chapter page.
- **Novel:** open its info page and choose **Delete novel** in the **⋯** menu beside **Edit details**.

Both actions show a confirmation dialog naming the item. Deletions reject stale revisions, disappear from the CMS, and are excluded from the next static build. Deleting the last published chapter makes the novel a draft again. Previously deployed sites only change after you rebuild and redeploy.

Deletion retains plain-text files for manual recovery:

- A chapter is removed from `index.json`. Its saved Markdown stays in the novel folder, and the previous chapter entry and immutable snapshots remain in `history/`. To restore it, stop the CMS, copy that chapter entry from a history index into the current `chapters` array at the desired position, also add its `{ "type": "chapter", "number": N }` reference to the desired position in `contents` if that array exists, and set `publication` to `published` if you are restoring a published chapter to a draft novel. Snapshot references restore the version captured at deletion; switch `contentFile` to `chapter-N.md` if you want to use the retained working file. Chapter IDs are not reused while their retained files exist.
- A novel's entire folder moves to `<content-folder>/.trash/novels/<original-id>--<unique-id>/`. To restore it, stop the CMS and move that folder back to `novels/<original-id>/`, using the `id` in its `index.json`. Do not overwrite an existing folder. If a crash left `.write-lock` in the archived folder, remove that empty lock only after confirming the CMS is stopped. Restart the CMS after recovery.

There is no permanent-delete or restore interface yet. Retained files and trash are never included in static exports.

## Development and testing data

Use the bundled repository library for manual checks, explicitly overriding any private library configured in `.env.local` or your shell:

```sh
FOLIO_DATA_DIR="$PWD/data" npm run dev:cms
FOLIO_DATA_DIR="$PWD/data" npm run build:cms
FOLIO_DATA_DIR="$PWD/data" npm run start:cms
FOLIO_DATA_DIR="$PWD/data" npm run build:static
```

Automated tests use disposable fixtures; the integration test's final build explicitly restores the bundled repository library. Agent development instructions are in `AGENTS.md`. Your normal commands can continue using your private `.env.local` configuration.

## Characters and relationships

The novel page has **Characters** and **Relationships** tabs beside **Contents**. Static exports show them only when the novel has characters or relationships.

**Characters** are grouped by category, in the order you choose, with uncategorized characters last. In the local CMS, **Add character** creates a profile; type in its **Category** field to pick a category or create a new one. **Edit categories** renames, reorders, adds, and removes categories; removing a category keeps its characters, without a category. The arrow buttons on a card move it within its category, and its edit dialog can remove it.

**Relationships** draws a map of who is connected to whom, with the full list beside it. Each relationship links two characters with a short label and reads as a sentence, such as “Mara is Ivo’s mentor”. Mark it **Mutual** when it is the same both ways, such as friends or siblings. Select a person to highlight their links; drag people to tidy the drawing (positions are not saved). People without relationships wait in a lane at the edge of the map. Removing a character also removes its relationships.

Profiles are optional plain-text metadata in the novel's `index.json`, for example:

```json
"characters": [
  {
    "id": "mara",
    "name": "Mara Vale",
    "role": "Cartographer",
    "category": "Expedition",
    "introduction": "A mapmaker searching for a city that disappeared from every atlas."
  },
  {
    "id": "ivo",
    "name": "Ivo Reed",
    "role": "Traveling companion",
    "category": "Expedition",
    "introduction": "A former courier who remembers every road he has traveled."
  },
  { "id": "sable", "name": "Sable", "role": "Rival mapmaker" }
],
"characterCategories": ["Expedition", "Rivals"],
"characterRelations": [
  { "from": "mara", "to": "ivo", "label": "mentor" },
  { "from": "ivo", "to": "sable", "label": "rivals", "mutual": true }
]
```

Only `name` is required; `role`, `introduction`, and `category` can be omitted or left empty. Introductions are plain text, with line breaks preserved. Array order controls display order within each category.

- `id` identifies a character in relationships: letters, numbers, hyphens, or underscores, unique within the novel. The CMS assigns one. A hand-written profile without an `id` gets `character-1`, `character-2`, … by position, so give characters explicit IDs before writing relationships by hand.
- `characterCategories` sets the order of categories and may list empty ones. A category used by a character but missing from the list is added to its end.
- A relationship reads “`from` is `to`’s `label`”, or “`from` and `to`: `label`” when `mutual` is `true`. Both characters must exist and be different.

Existing indexes without these fields continue to work. The limits are 100 profiles, 200 characters per name or role, 10,000 characters per introduction, 50 categories of up to 100 characters, and 500 relationships with labels of up to 60 characters.

Like the synopsis, character profiles, categories, and relationships are reader-facing metadata, not private planning notes. They stay out of exports while the novel is a draft; the current ones of a published novel appear on its next static export without a separate publication step. Saves use the same conflict detection and metadata history as other novel details.

## Keep manuscripts out of the template repository

Keep this checkout for Folio's application code and bundled examples, and keep your personal library in a separate folder outside the repository. A second clone is unnecessary for this: the application already supports an external content directory.

For example, create a folder at `/Users/your-name/Documents/FolioLibrary`. Then create `.env.local` alongside `package.json`:

```dotenv
FOLIO_DATA_DIR=/Users/your-name/Documents/FolioLibrary
```

Use your real absolute path, without `~`. Next.js loads this file for the normal development, build, and start commands. `.env.local` is already ignored by this repository. Restart the server after changing it. Creating your first novel creates the library's `novels/` subfolder automatically; the bundled examples are not copied into it.

Your folders would look like:

```text
programs/folio/             # application/template Git repository
    .env.local             # ignored, points to your library
    data/novels/            # bundled examples only
Documents/FolioLibrary/    # your private manuscripts and history
    novels/
    genres.json
```

A push of the application repository cannot include files outside its working tree. If you want Git history or off-device backup for your manuscripts, make the library folder its own private repository, independently of the template. Keep an additional backup as appropriate. Do not write personal manuscripts into the tracked demo files: adding an ignore rule would not stop Git tracking files already in the repository.

## Images

Markdown images are supported in chapter reading and editing previews:

```markdown
![A description of the image](/images/folio-logo.svg)
```

This working example uses `public/images/folio-logo.svg`, Folio's Folded F icon drawn in SVG. Open **Formatting Examples → Images in a Chapter** in the bundled library to see it rendered. The example works offline and is included in static exports.

For another local image, place the file under `public/images/` and use `/images/your-file.png` in Markdown. Do not include `public` in the URL. HTTPS image URLs also work, but need network access. Use meaningful alternative text between the square brackets.

There is no upload/paste-image interface yet. Images inside an external `FOLIO_DATA_DIR` are **not** currently served automatically. Also, the entire application `public/` folder is exported, independently of chapter publication state. Keep private manuscript artwork outside `public/` until you intend to distribute it; a content-directory media pipeline with publication filtering is still future work.

## Saving and recovery

Before committing a change, Folio stores the previous index in `history/` and snapshots its referenced Markdown in `revisions/`. A durable `.pending.json` journal records the new index and draft contents. Files are written through temporary files, flushed, and renamed. On the next read, an interrupted journal is replayed if no writer lock remains.

If the process was forcibly stopped during a save:

1. Stop all Folio processes using that content folder and back up the novel directory.
2. Remove the empty `.write-lock` directory inside that novel **only after confirming no writer is running**.
3. Restart Folio and open the novel. A remaining `.pending.json` is replayed automatically; do not delete that journal.

To restore an older revision, stop Folio, back up the novel, and copy the desired history JSON over `index.json`. Its references point to retained Markdown snapshots. You can copy a chosen working snapshot back to `chapter-N.md` and update `contentFile` accordingly; subsequent CMS saves also restore that canonical working filename. There is no graphical history browser yet.

Back up the entire content directory. History is retained without automatic cleanup in this milestone. External text editors do not participate in Folio's filesystem lock; avoid editing the same file at the exact instant the CMS is saving it.

## Validation

```sh
npm test
npm run test:integration
```

Unit tests cover saving, reopening, publication snapshots, external edit conflicts, history, interrupted transaction recovery, path checks, legacy compatibility, and Markdown sanitization. Integration tests use a temporary library, build and run the production CMS, exercise the complete two-chapter workflow, then build a static export and scan all exported bytes for private content and CMS code. They check direct chapter URLs and absent CMS/draft routes, then rebuild `out/` using the repository’s demo library. Your manuscripts are not modified by these tests.

Static routes use `*.public.tsx`. The CMS route tree uses `*.cms.tsx` / `*.cms.ts`, including the editing controls composed into the shared library, novel, and chapter views; `pageExtensions` selects exactly one tree at build time. Shared components and the content service remain ordinary TypeScript files.


## Genres

Genres remain plain text. `genres.json` in your chosen content directory maps stable genre keys to display names, for example:

```json
{
  "Fantasy": "Speculative fiction",
  "Mystery": "Mystery"
}
```

Novel indexes use `genreKey` for membership. Legacy indexes without it use their existing `genre` value as the key. Renaming a genre updates this one catalog rather than rewriting every manuscript. Change `genreKey` to move a novel into another category when editing JSON directly. The `genre` field records the display name at its last save; the catalog takes precedence when reading it. New genres may exist without novels and appear only in the local library until published novels use them.

Genre saves use a separate `.genres-lock` and retain prior catalogs in `genre-history/`. If a process stops while holding this empty lock, stop all Folio processes before removing it. The catalog itself is replaced atomically. Your Markdown files are unchanged by genre operations.
