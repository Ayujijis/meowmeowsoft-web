# Meow Meow Soft

Portfolio at [meowmeowsoft.com](https://meowmeowsoft.com). DBmaker: [dbmaker.meowmeowsoft.com](https://dbmaker.meowmeowsoft.com).

```bash
npm install
npm run dev
```

## Deploy

Push to `main` on GitHub. GitHub Actions builds the site and deploys to Cloudflare Pages (`meowmeowsoft-web`).

Set these repository secrets:

- `CLOUDFLARE_API_TOKEN` — token with **Cloudflare Pages: Edit**
- `CLOUDFLARE_ACCOUNT_ID` — `974e84b53ef389050af4a398452978fc`

Local deploy still works: `npm run deploy`.

## 3D models

Put `.glb`, `.gltf`, `.3mf`, and `.blend` files in [`public/models/`](public/models/). They ship with the site at `/models/<filename>`.

## Private DBmaker branch (`/dbmaker-lab`)

Preview builds of a DBmaker branch without committing them to GitHub. The WASM publish output lives in **Cloudflare R2** under the `dbmaker-lab/` prefix.

1. In Cloudflare Pages → **meowmeowsoft-web** → **Settings** → **Environment variables**, add:
   - `DBMAKER_LAB_KEY` — shared password (Production and Preview).
2. Ensure the **MODELS** R2 bucket binding is attached (same as the 3D upload API).
3. Open `/dbmaker-lab` on the site, enter the password, then upload your published folder (e.g. Blazor `publish/wwwroot`).
4. Share the page URL and password with testers only.

Local testing with Functions + R2:

```bash
cp .dev.vars.example .dev.vars   # set DBMAKER_LAB_KEY
npx wrangler pages dev dist --compatibility-date=2026-09-10
```

Never commit `.dev.vars`, `public/dbmaker-lab/`, or publish folders.

## Email

`hello@meowmeowsoft.com` is meant to forward through Cloudflare Email Routing.
