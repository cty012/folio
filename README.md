# Folio

A local writing workspace and a static novel reader. Manuscripts stay in plain-text Markdown and JSON, with no database or account required.

## Run the writing workspace

Use Node.js 22.18 or newer, then:

```sh
npm install
npm run dev:cms
```

Open the local URL printed by the server. Reading and writing use the same pages:

- **Library:** create novels, edit each novel’s details, and add or rename genres beside the genre list. Search, filter, group, and sort your collection.
- **Novel page:** edit its title, author, description, genre, and status; add chapters and change their order.
- **Chapter page:** read the working manuscript, choose **Edit chapter** to write in place, and save with **Save draft** or **⌘S / Ctrl+S**. **Preview** renders unsaved Markdown in the same reading surface. You can also inspect the published version here.

The local build includes both drafts and published work in this navigation. Static exports use the same visual design and omit editing controls and unpublished content. The old `/studio/` URL redirects to the library.

Save before leaving a chapter. Unsaved text is kept as a browser recovery copy when browser storage is available; after reopening the chapter, choose **Restore text**. Disk saves are explicit, not automatic.

**Publish chapter** captures the saved text and title as a separate snapshot and makes the novel eligible for static export. Later edits remain drafts until you publish another saved revision. **Unpublish** excludes a chapter from future exports; it stays available locally and is not removed from an already deployed site. Rebuild and replace that site's files to update it.

For a production local CMS:

```sh
npm run build:cms
npm run start:cms
```

The CMS binds to this computer (`127.0.0.1`). Write requests require a matching local Origin and JSON content type. It is designed for a single trusted local user; do not expose it through a public proxy.

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

Open `chapter-N.md` in any text editor. Edit titles and the chapter array order in `index.json`. The `number` is a stable chapter identity used in filenames and URLs; the array position is its displayed reading order. Don't renumber chapters when reordering them.

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
![A description of the image](/images/folio-logo.png)
```

This working example uses `public/images/folio-logo.png`, copied from Folio's existing app icon. Open **Formatting Examples → Images in a Chapter** in the bundled library to see it rendered. The example works offline and is included in static exports.

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

Unit tests cover saving, reopening, publication snapshots, external edit conflicts, history, interrupted transaction recovery, path checks, legacy compatibility, and Markdown sanitization. Integration tests use a temporary library, build and run the production CMS, exercise the complete two-chapter workflow, then build a static export and scan all exported bytes for private content and CMS code. They check direct chapter URLs and absent CMS/draft routes, then rebuild `out/` using your normal library. Your manuscripts are not modified by these tests.

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
