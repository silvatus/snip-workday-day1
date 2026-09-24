# Snip backend

This is the backend for the Snip tiny URL shortener demo.

## Run

```bash
bun start
```

The service listens on port `3000` by default and stores links in memory.

## API

- `POST /api/links` with `{ "url": "https://example.com" }` creates a short link.
- `GET /api/links` lists all links.
- `GET /:code` redirects to the original URL and increments its hit count.

## Configuration

- `PORT` changes the listening port.
- `BASE_URL` sets the origin used in generated short URLs.
- `RAILWAY_PUBLIC_DOMAIN` supplies an HTTPS origin when `BASE_URL` is unset.
- `PUBLIC_DIR` enables static file serving, including `index.html` at `/`.
