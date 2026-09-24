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

## Clone

Clone recursively so Git checks out the three application layers:

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

Use the same workflow with `frontend` or `cli` in place of `backend`.# Snip CLI

A zero-dependency Node.js client for the Snip URL shortener.

```bash
node cli.js add https://example.com/long-url
node cli.js ls
node cli.js open abc123
```

The CLI requires Node.js 18 or newer. Set `SNIP_API` to change the backend URL from
the default `http://localhost:3000`.# SnipFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
