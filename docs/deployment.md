# Deployment configuration

This repository is prepared for a Docker deployment of the backend on Render
and a static Vite deployment of the frontend on Vercel. Deployment itself is
performed from the provider dashboards.

## Render backend

Create a Web Service with the Docker runtime and use these settings:

- Root Directory: leave empty so the build context is the repository root.
- Dockerfile Path: `backend/Dockerfile`.
- Health Check Path: `/health`.
- Docker Command: leave empty to use the image `CMD`.

The container starts one Uvicorn process on `0.0.0.0`. It uses Render's
`PORT` value and falls back to `8000` for local Docker runs.

Configure these environment variables in Render:

- `OPENAI_API_KEY`: secret OpenAI API key.
- `FRONTEND_ORIGINS`: exact Vercel frontend origin, without a trailing slash.
  Multiple explicit origins can be supplied as a comma-separated list when
  preview origins also need access. Do not use `*` in production.
- `ASK_RATE_LIMIT_PER_MINUTE`: maximum accepted `/ask` requests per client and
  minute (`5` by default, `0` disables this limit).
- `ASK_DAILY_LIMIT`: maximum accepted `/ask` requests per instance and UTC day
  (`100` by default, `0` disables this limit).

Requests exceeding either limit receive HTTP `429` before retrieval, index
initialization, or generation. On Render, the limiter uses the first validated
IP in `X-Forwarded-For` only when Render's automatic `RENDER=true` variable is
present. Elsewhere it uses the direct connection address, so an arbitrary
forwarded header is not trusted. Render documents `X-Forwarded-For` as the way
to obtain the client IP behind its edge, but IP-based limits remain approximate
for shared networks, VPNs, and changing client addresses.

Counters live only in the Python process. They reset on restart or redeploy and
are not shared by multiple processes or Render instances. This is suitable for
the current single-instance demo, not a distributed production quota. Keep an
independent OpenAI project budget and provider-side usage limits as a second
line of defense.

The image downloads the pinned `sentence-transformers/all-MiniLM-L6-v2`
model during the Docker build and runs Hugging Face in offline mode afterward.
At process startup, neither the embedding model, PDF corpus, Chroma index, nor
OpenAI client is initialized. `/health` therefore remains a lightweight
readiness check and makes no OpenAI request.

The first `/search` or `/ask` request builds the in-memory index from the five
packaged PDFs and can have a noticeable cold-start delay and temporary CPU/RAM
peak. The index is then cached for the life of the single process. A process
restart rebuilds it; no external persistence is used.

Uvicorn and the application write to stdout/stderr. Render displays these
streams in the service **Logs** view, including the JSON observability events
for `/ask` and their `request_id` values.

## Vercel frontend

Create a Vercel project from the same repository with these settings:

- Root Directory: `frontend`.
- Framework Preset: Vite.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Install Command: use the detected npm command (`npm install`/`npm ci`).

Enable **Include source files outside of the Root Directory in the Build Step**
in the Vercel project settings. The Vite build reads the canonical PDFs from
`data/sample_docs` and copies them into the static output; this avoids storing a
second copy under `frontend`.

Configure `VITE_API_BASE_URL` for the desired Vercel environment. Its value is
the public Render service origin, without a trailing slash. Vite injects this
value at build time, so changing it requires a new frontend build. No production
backend URL is hardcoded in the source.

No `vercel.json` is required: Vercel detects Vite and the project has no
client-side router that needs rewrite rules. The frontend Dockerfile remains
available for local/container use and is not used by Vercel. Build it from the
repository root so the canonical PDF corpus is available to Vite:

```bash
docker build --file frontend/Dockerfile .
```

## Connect the deployments

After both providers assign their real service URLs:

1. Set Render `FRONTEND_ORIGINS` to the Vercel frontend origin.
2. Set Vercel `VITE_API_BASE_URL` to the Render backend origin.
3. Redeploy both services so their environment configuration is applied.

The backend keeps the local development origins when `FRONTEND_ORIGINS` is
unset. Once it is set on Render, the configured comma-separated origins replace
those defaults. `X-Request-ID` is exposed through CORS so browser code can read
it.
