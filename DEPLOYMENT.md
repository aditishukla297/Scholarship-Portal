# Deploying to Vercel

The portal deploys as **two Vercel projects from one repository** — the API and the web client.
Keeping them separate is simpler than a monorepo build and lets you redeploy either on its own.

```
MongoDB Atlas  ←  Scholarship-Portal-api  (server/)   ←  Scholarship-Portal-web  (client/)
   database           serverless Express               static React build
```

---

## Why the code had to change for serverless

Vercel runs the API as serverless functions, which differ from a long-running server in two ways
that mattered here:

1. **The filesystem is read-only.** Uploaded documents were written to `server/uploads/`; they are
   now stored in MongoDB in a `documentfiles` collection (`server/src/models/DocumentFile.js`),
   one record per file. The upload directory is gone.
2. **The process is recycled.** The Mongoose connection and its in-flight promise are cached on
   `globalThis` (`server/src/config/db.js`) so a warm instance reuses the pool instead of opening a
   new one per request, which would exhaust the Atlas connection limit.

`server/src/index.js` therefore only calls `app.listen()` when `process.env.VERCEL` is unset;
on Vercel, `server/api/index.js` is the entry point and connects lazily per request.

---

## Step 1 — MongoDB Atlas

1. Create a free **M0 cluster** at cloud.mongodb.com.
2. **Database Access** → add a database user; note the username and password.
3. **Network Access** → add `0.0.0.0/0` (allow from anywhere). Vercel's function IPs are not
   fixed, so an IP allow-list will not work on the free plan.
4. **Connect** → *Drivers* → copy the connection string, which looks like:

   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/mota_scholarship?retryWrites=true&w=majority
   ```

   Add the database name `mota_scholarship` before the `?`, and URL-encode any special characters
   in the password.

## Step 2 — Seed Atlas

Run the seeder from your machine, pointed at Atlas:

```bash
cd server
MONGO_URI="mongodb+srv://…/mota_scholarship?retryWrites=true&w=majority" npm run seed
```

This creates the 5 schemes, 63 accounts and 80 sample applications in the cloud database.
**It clears the collections first**, so never run it against a database you care about.

## Step 3 — Deploy the API

```bash
npm i -g vercel
cd server
vercel
```

Answer the prompts, then set the environment variables — **Production, Preview and Development**:

| Variable | Value |
|---|---|
| `MONGO_URI` | the Atlas connection string from Step 1 |
| `JWT_SECRET` | a long random string — generate with `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `8h` |
| `CLIENT_ORIGIN` | the web URL from Step 4 (set it after, then redeploy) |
| `MAX_UPLOAD_MB` | `5` |

Either through the dashboard, or:

```bash
vercel env add MONGO_URI production
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
| `503` and "unable to reach its database" | `MONGO_URI` wrong, or Atlas Network Access does not include `0.0.0.0/0` |
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
- **Atlas M0** allows 500 connections and 512 MB; documents stored in MongoDB count toward that.
- **Sample data is shared.** Anyone visiting the deployed URL writes to the same database. Re-run
  the seeder to reset it.
