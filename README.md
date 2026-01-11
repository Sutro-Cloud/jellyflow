# Jellyflow

A modern, coverflow-inspired Jellyfin music browser and player built with React + Vite.

## Requirements

- Node.js 18+
- A Jellyfin server with music library access

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Open the app:

   - http://localhost:3000

## Production build

```bash
npm run build
npm run preview
```

## Docker image (GitHub Container Registry)

Build and publish the image to GHCR so you can reference it from `docker-compose.yml`.

```bash
export GHCR_USER="your-github-username"
export GHCR_REPO="jellyflow"
export GHCR_TAG="latest"

docker build -t ghcr.io/${GHCR_USER}/${GHCR_REPO}:${GHCR_TAG} .
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker push ghcr.io/${GHCR_USER}/${GHCR_REPO}:${GHCR_TAG}
```

Notes:
- The token must have `write:packages` (and `read:packages`) scope.
- Update `docker-compose.yml` to use the published image:

  ```yaml
  services:
    jellyflow:
      image: ghcr.io/your-github-username/jellyflow:latest
  ```

## Ads (optional)

Ads are build-time toggles (Vite env vars). By default, ads are disabled.

```bash
VITE_ADS_ENABLED=true
VITE_ADS_PROVIDER=adsense
VITE_ADS_CLIENT=ca-pub-xxxxxxxxxxxxxxxx
VITE_ADS_SLOT=1234567890
# Optional for custom providers:
# VITE_ADS_SCRIPT_URL=https://example.com/ad.js
```

When enabled, an ad slot appears between the now playing info and the status controls.

## Connect to Jellyfin

1. Click **Connect**.
2. Enter your Jellyfin server URL, username, and password.
3. Save & connect.
4. Optional: expand **Use API key instead** to authenticate with an API key and user ID.

## Notes

- If your Jellyfin server blocks requests from this origin, enable CORS for `http://localhost:3000` in Jellyfin or your reverse proxy.
- Album art and audio stream directly from your Jellyfin server using your API key.
- Optional: enable “Fetch lyrics from LRCLIB (online)” in the connection dialog to load lyrics on the fly.

## Contributing

See `CONTRIBUTING.md` and `AGENTS.md` for setup, style, and PR expectations.
