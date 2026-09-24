# Snip

Snip is a tiny URL shortener built as one backend with two clients. The Bun backend
owns the in-memory link store and HTTP API; an Angular browser app and a zero-dependency
Node.js CLI both consume that same API.

## API

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201` with `{ code, url, shortUrl, hits, createdAt }`; `400` on invalid input |
| `GET` | `/api/links` | - | `200` with an array of link objects |
| `GET` | `/:code` | - | `302` to the original URL and increments hits; `404` when unknown |

## Repository layout

Each application layer lives on its own branch of this repository. The `main` branch
is the superproject and pins those branches as Git submodules.

| Path | Branch | Purpose |
| --- | --- | --- |
| `backend/` | `backend` | Bun API server and in-memory link store |
| `frontend/` | `frontend` | Angular browser client |
| `cli/` | `cli` | Node.js command-line client |
| `bundle/` | `bundle` | Generated release containing the server, UI, and CLI |

## Clone

Clone recursively so Git checks out the application layers and generated release:

```bash
git clone --recurse-submodules https://github.com/silvatus/snip-workday-day1
```

A plain `git clone` leaves the submodule folders empty. If you already cloned without
the flag, initialize them with:

```bash
git submodule update --init --recursive
```

## Run

Start each piece in a separate terminal. Install the frontend packages once before
starting its development server.

```bash
cd backend
bun start
```

```bash
cd frontend
npm install
npx ng serve
```

```bash
cd cli
node cli.js add https://example.com/long-url
node cli.js ls
node cli.js open abc123
```

The backend defaults to `http://localhost:3000`, and the frontend defaults to
`http://localhost:4200`. Set `SNIP_API` to point the CLI at another backend URL.

The generated bundle serves the API and built frontend from one process:

```bash
cd bundle
bun start
```

## Generated release

Do not hand-edit generated files in `bundle/`. Regenerate them from the source
submodules with:

```bash
node scripts/build-bundle.mjs
```

Pass `--push` to publish the generated `bundle` branch and the updated `main`
submodule pointers. Re-running the script with unchanged inputs is a safe no-op.

## Update a layer

First work inside the submodule, then commit and push that branch:

```bash
cd backend
# edit files
git add .
git commit -m "Describe the backend change"
git push
```

Then return to the superproject, update the tracked branch, and commit the new
submodule pointer:

```bash
cd ..
git submodule update --remote backend
git add backend
git commit -m "Update backend pointer"
git push
```

Use the same workflow with `frontend` or `cli` in place of `backend`.
