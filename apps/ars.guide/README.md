# ars.guide

An interactive documentation and spell reference guide for [Ars Nouveau](https://www.curseforge.com/minecraft/mc-mods/ars-nouveau). Browse spells, read the in-game book, and submit community spell creations.

## Tech Stack

- [Astro](https://astro.build) with React and Svelte components
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com)
- Discord OAuth via [Better Auth](https://www.better-auth.com)
- GitHub integration via [Octokit](https://github.com/octokit) for spell submission PRs

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Validate and build for production |
| `pnpm preview` | Build and preview with Wrangler |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |
| `pnpm check` | Run spell submission validation and Astro type checking |
