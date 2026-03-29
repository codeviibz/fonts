# MVP app (`apps/mvp`)

Font subscription platform — local MVP.

## Stack

- Next.js (App Router) + TypeScript
- PostgreSQL (Docker) via raw `pg` pool
- NextAuth with `@auth/pg-adapter` (database sessions)
- Tailwind CSS + ShadCN-style components
- SQL migrations (no ORM)

## Quick start

```bash
# 1. Start Postgres
cd apps/mvp && docker compose up -d

# 2. Create env file
cp .env.example .env.local

# 3. Install deps (from repo root)
npm install

# 4. Run migrations + seed
npm run mvp:setup

# 5. Start dev server
npm run dev:mvp
```

Open `http://localhost:3000`

## Seeded users

| Email            | Role       | Subscription |
| ---------------- | ---------- | ------------ |
| admin@test.com   | admin      | none         |
| user@test.com    | subscriber | active (pro) |
| free@test.com    | subscriber | none         |

## Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Start Next.js dev server on :3000   |
| `npm run migrate`      | Run SQL migrations                  |
| `npm run sync`         | Sync JSON catalog to Postgres       |
| `npm run seed`         | Seed users + subscriptions          |
| `npm run setup`        | migrate + sync + seed               |
| `npm run typecheck`    | TypeScript check                    |
