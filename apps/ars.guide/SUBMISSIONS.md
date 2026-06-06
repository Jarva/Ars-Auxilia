# Spell submission worker setup

The submit form runs through Astro API routes deployed on Cloudflare Workers.

## Discord OAuth

Create a Discord application and add this redirect URI:

- Production: `https://ars.guide/api/auth/callback/discord`
- Local: `http://localhost:4321/api/auth/callback/discord`

Set these Cloudflare secrets:

```sh
pnpm --filter @ars/guide exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @ars/guide exec wrangler secret put DISCORD_CLIENT_ID
pnpm --filter @ars/guide exec wrangler secret put DISCORD_CLIENT_SECRET
```

## GitHub App

Create and install a GitHub App on `Ars-Nouveau/Ars-Auxilia` with these repository permissions:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read-only

Set these Cloudflare secrets:

```sh
# Use the GitHub App client ID here; the numeric app ID also works.
pnpm --filter @ars/guide exec wrangler secret put GITHUB_APP_ID
pnpm --filter @ars/guide exec wrangler secret put GITHUB_APP_PRIVATE_KEY
```

`GITHUB_APP_INSTALLATION_ID` must be the numeric installation id. If it is omitted or non-numeric, the Worker logs an Octokit-generated installation URL and returns a setup error instead of trying to create a PR.

Non-secret defaults live in `wrangler.jsonc`:

- `BETTER_AUTH_URL=https://ars.guide`
- `GITHUB_OWNER=Ars-Nouveau`
- `GITHUB_REPO=Ars-Auxilia`
- `GITHUB_BASE_BRANCH=main`

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in the same values.
