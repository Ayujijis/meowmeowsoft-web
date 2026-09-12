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

## Email

`hello@meowmeowsoft.com` is meant to forward through Cloudflare Email Routing.
