# Talal Kadli's Portfolio

This repository contains the source for [talal.kadli.org](https://talal.kadli.org), a personal
portfolio built with Next.js, React, TypeScript, PostgreSQL, and Once UI.

## Features

- Portfolio, projects, blog, gallery, notes, statistics, wall, and utility pages
- MDX-backed blog posts and project case studies
- Password-protected public routes with per-route access and map visibility controls
- Private admin area for notes, wall moderation, site text, route settings, and fakemail aliases
- PostgreSQL-backed content, visitor statistics, reactions, and configuration
- Dynamic metadata, RSS, sitemap, robots, and Open Graph image generation
- Docker and Caddy configuration for self-hosting

## Local development

Next.js 16 requires Node.js 20.9 or newer. Install the project dependencies and start the local
server:

```sh
npm install
npm run dev
```

The database-backed features require PostgreSQL. A local database can be started from the provided
example:

```sh
cp .env.example .env
docker compose -f docker-compose.dev.yml.example up -d
```

Configure `.env.local` with the matching `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD` values, plus any access, admin, or Cloudflare settings needed for the features you
want to exercise. Real environment files are ignored by Git.

## Content and configuration

- Site content: `src/resources/content.tsx`
- Theme, routes, and sharing: `src/resources/once-ui.config.ts`
- Blog posts: `src/app/blog/posts/*.mdx`
- Project case studies: `src/app/projects/projects/*.mdx`
- Default protected-page prefixes: `src/lib/page-access-routes.ts`
- Public route map and lock defaults: `src/lib/public-routes.ts`

The admin area is available at `/admin`. Database tables and migrations are initialized by
`src/lib/database.ts`.

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
```

The production build also generates the code metrics consumed by the Statistics page.

## Self-hosted deployment

The production examples use Docker, PostgreSQL, and Caddy:

```sh
cp docker-compose.yml.example docker-compose.yml
cp Caddyfile.example Caddyfile
cp .env.example .env
docker compose up -d
```

Set strong values in `.env` and confirm the hostname in `Caddyfile` before starting the stack. The
Fakemail feature additionally requires the Cloudflare Email Routing values documented in
`.env.example`.

## Credits and license

The interface is based on [Magic Portfolio](https://once-ui.com/products/magic-portfolio) by
[Once UI](https://once-ui.com). The project remains subject to the
[CC BY-NC 4.0 license](LICENSE), including its attribution and non-commercial-use requirements.
