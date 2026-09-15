# Deploying to Vercel

The portal deploys as **two Vercel projects from one repository** — the API and the web client.
Keeping them separate is simpler than a monorepo build and lets you redeploy either on its own.

```
Neon Postgres  ←  Scholarship-Portal-api  (server/)   ←  Scholarship-Portal-web  (client/)
   database           serverless Express               static React build
```

---

## Why the code had to change for serverless

Vercel runs the API as serverless functions, which differ from a long-running server in two ways
that mattered here:

1. **The filesystem is read-only.** Uploaded documents were written to `server/uploads/`; they are
   now stored in the database as `BYTEA` in the `document_files` table, one row per file. The
   upload directory is gone.
2. **The process is recycled.** The `pg` pool is cached on `globalThis` (`server/src/db/pool.js`)
   so a warm instance reuses its connections instead of opening a new pool per request, which
   would exhaust the database connection limit.

`server/src/index.js` therefore only calls `app.listen()` when `process.env.VERCEL` is unset;
on Vercel, `server/api/index.js` is the entry point and connects lazily per request.

---

## Step 1 — Postgres

Any hosted Postgres works. **Neon** (neon.tech) has a genuinely free tier and a pooled endpoint
built for serverless, so it is the path described here; Supabase works the same way.

1. Sign up at neon.tech and create a project — region **Singapore** or **Mumbai** if offered.
2. On the project dashboard, open **Connection string** and choose the **Pooled connection**.
   The pooled host has `-pooler` in it; use that one, because serverless functions open and drop
   connections constantly.
3. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

Nothing else to configure — Neon accepts connections from anywhere, so there is no IP allow-list
step.

## Step 2 — Create the schema and seed it

The seeder applies `server/src/db/schema.sql` itself, so one command does both:

```bash
cd server
DATABASE_URL="postgresql://…-pooler…/neondb?sslmode=require" npm run seed
```

This creates the tables, then loads the 5 schemes, 63 accounts and 80 sample applications.
**It truncates every table first**, so never point it at a database you care about.

To apply the schema without seeding, run `npm run migrate` instead. Both are idempotent.

## Step 3 — Deploy the API

```bash
npm i -g vercel
cd server
vercel
```

Answer the prompts, then set the environment variables — **Production, Preview and Development**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | the pooled Postgres connection string from Step 1 |
| `JWT_SECRET` | a long random string — generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `8h` |
| `CLIENT_ORIGIN` | the web URL from Step 4 (set it after, then redeploy) |
| `PG_POOL_MAX` | `5` |
| `MAX_UPLOAD_MB` | `5` |

Either through the dashboard, or:

```bash
vercel env add DATABASE_URL production
vercel --prod
```

Check it: `https://<your-api>.vercel.app/api/health` should return `{"status":"UP",…}`.

## Step 4 — Deploy the web client

```bash
cd ../client
vercel
```

Set one environment variable, **including the `/api` suffix**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<your-api>.vercel.app/api` |

Then `vercel --prod`.

Vite inlines environment variables **at build time**, so changing `VITE_API_URL` requires a
redeploy — it is not read at runtime.

## Step 5 — Close the CORS loop

Go back to the API project, set `CLIENT_ORIGIN` to the web URL
(`https://<your-web>.vercel.app`, no trailing slash) and redeploy it. Until you do, the browser
will block every API call with a CORS error while `curl` continues to work — that mismatch is the
usual symptom.

---

## Deploying from the dashboard instead

Import the GitHub repository twice and set **Root Directory** differently on each:

| Project | Root Directory | Framework preset |
|---|---|---|
| API | `server` | Other |
| Web | `client` | Vite |

Vercel then redeploys both on every push to `main`.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `503` and "unable to reach its database" | `DATABASE_URL` wrong, or missing `?sslmode=require` |
| `too many connections` under load | using the direct rather than the **pooled** Neon host, or `PG_POOL_MAX` set too high |
| Works in `curl`, fails in the browser | `CLIENT_ORIGIN` does not exactly match the web origin |
| Login succeeds, next call returns `401` | `JWT_SECRET` differs between deployments, invalidating issued tokens |
| Deep links such as `/officer/selection` return 404 | `client/vercel.json` rewrite missing — every path must fall through to `index.html` |
| API calls 404 against the web domain | `VITE_API_URL` unset at build time, so the client fell back to the relative `/api` |
| Uploads fail over ~4.5 MB | Vercel caps a serverless request body at about 4.5 MB, below the app's own 5 MB limit |
| First request after idle is slow | Serverless cold start plus the initial Atlas handshake; subsequent requests reuse both |

## Limits worth knowing before you demo

- **Cold starts.** A free-plan function that has been idle takes a few seconds on the first
  request. Load the site once shortly before presenting.
- **Upload ceiling.** Vercel's ~4.5 MB request body limit binds before the app's 5 MB rule.
- **Neon free tier** gives 0.5 GB of storage; uploaded files are stored as `BYTEA` and count
  toward it. A few hundred 5 MB uploads would fill it — irrelevant for a demo, worth knowing.
- **Neon scales to zero** when idle, so the first query after a pause takes a second or two.
- **Sample data is shared.** Anyone visiting the deployed URL writes to the same database. Re-run
  the seeder to reset it.

---

## Running Postgres locally

```bash
brew install postgresql@14 && brew services start postgresql@14
createdb mota_scholarship
```

Then set `DATABASE_URL=postgresql://$(whoami)@localhost:5432/mota_scholarship` in `server/.env`
and run `npm run seed`. TLS is disabled automatically for localhost connections.
