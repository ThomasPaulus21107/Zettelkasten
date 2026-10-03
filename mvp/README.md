# Cloudflare Reader MVP

Private, read-only iPhone web app for searching titles and note bodies in `ThomasPaulus21107/VAULTS`. GitHub remains the source of truth. The app repository contains code and configuration templates, never Vault Markdown.

## Scope

- Search titles, aliases and body text in `SX` and `DX`; open a note with its source path and revision.
- Share the original Markdown file through the iPhone share sheet, or open the print flow to save/share a PDF.
- Worker-level Cloudflare Access plus an explicit email allowlist. All routes, including HTML, CSS and JavaScript, require authentication.
- Each search or note read checks the current GitHub branch SHA. An unavailable GitHub API or an outdated D1 index returns HTTP 503.
- One scheduled GitHub Action checks the Vault hourly and publishes a complete D1 snapshot if the revision changed.

The browser renders Markdown as safe text blocks. Rich Obsidian features, graphs, editing and automatic conversion to a PDF file are outside this first MVP. The print flow should be checked on the target iPhone before public release.

## Cloudflare setup

1. Create a D1 database named `zettelkasten-reader` in the intended Cloudflare account. Apply [`schema.sql`](schema.sql) to it.
2. Copy `wrangler.example.jsonc` to `wrangler.jsonc`; set the D1 database ID and the owner's email in `ALLOWED_EMAILS`. Set the actual Vault default branch if it differs from `main`.
3. Add `GITHUB_TOKEN` as a Worker secret. It needs read-only access to the `VAULTS` repository. Never put it in `wrangler.jsonc` or source control.
4. Deploy the Worker using Wrangler. The template enables the free `workers.dev` address; a custom domain is optional. Turn on **Cloudflare Access for the entire Worker** before allowing users in, so every address and preview route is protected. Configure the Access policy for the same owner email. Check that an unauthenticated request to `/`, `/app.js` and `/api/search?q=test` is denied.
5. Add GitHub Actions secrets `VAULTS_READ_TOKEN`, `CLOUDFLARE_D1_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID` to this application repository. The D1 token should be restricted to this database/account. The VAULTS token needs repository contents read access only.
6. Run the sync once manually with `python mvp/scripts/sync.py --dry-run`. Review the included/excluded counts and paths against the actual Vault before the first publication. Then run the `Sync Cloudflare reader` workflow manually. Scheduled sync works after this branch reaches the default branch.
7. Check search, reading, Markdown sharing and PDF print/share on an iPhone. Confirm that changing the Vault makes reads return 503 until sync completes.

If D1 or Access provisioning is not complete, the Worker denies access or reports the source unavailable. Do not disable either check to make the site appear ready.

## Local checks

Run `node mvp/scripts/build-ui.mjs`, `node --test mvp/worker.test.mjs`, and `PYTHONPATH=mvp/scripts python3 -m unittest mvp/scripts/test_sync.py`. The local preview is `node mvp/scripts/preview.mjs` at `http://localhost:4174/`; its two notes are synthetic and never come from the private Vault.

## Cost and limits

The design targets free tiers and no paid database or server plan. Actual cost depends on Cloudflare usage, D1 size, GitHub Actions minutes, domain registration and any Access plan. Measure the first imported D1 database and action run time before confirming the under-€3 monthly target. A custom domain, if needed, is a separate cost.
