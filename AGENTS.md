# Development data

- Use the repository's `data/` folder for development builds and manual browser checks. Set `FOLIO_DATA_DIR` explicitly to its absolute path for every server/build command; never fall back to `.env.local` or an inherited content directory.
- Automated mutation tests may use isolated, disposable fixtures. Their final builds must explicitly use the repository's `data/` folder.
- Do not read, serve, export, or modify the user's external manuscript library or inspect `.env.local` to locate it. The user tests with their real library themselves.
- Preserve existing demo novels when checking deletion: create disposable test novels and delete only those.
