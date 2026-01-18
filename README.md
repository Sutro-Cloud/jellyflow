# Jellyflow

A modern, Jellyfin music browser and player built with React + Vite.

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

   - http://localhost:8067

## Production build

```bash
npm run build
npm run preview
```

## iOS (Capacitor)

Requirements:
- Xcode (latest stable)
- CocoaPods (`sudo gem install cocoapods`)

Build and run:

```bash
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode, select your iPhone and press **Run**.

Live reload (device on same network):

```bash
npm run dev
npx cap run ios -l --external
```

Troubleshooting: Capgo media session SPM error

If you see:

```
product 'CapgoCapacitorMediaSession' required by package 'capapp-spm' target 'CapApp-SPM' not found
```

Fix it after each `npx cap sync ios` (that command regenerates the file):

```bash
perl -0pi -e 's/CapgoCapacitorMediaSession/CapgoMediaSession/g' ios/App/CapApp-SPM/Package.swift
xcodebuild -resolvePackageDependencies
```

Then open `ios/App/App.xcworkspace` in Xcode and build again.

## Docker image (GitHub Container Registry)

Build and publish the image to GHCR so you can reference it from `docker-compose.yml`.

```bash
export GHCR_USER="sutro-cloud"
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
      image: ghcr.io/sutro-cloud/jellyflow:latest
  ```

## Connect to Jellyfin

1. Click **Connect**.
2. Enter your Jellyfin server URL, username, and password.
3. Save & connect.
4. Optional: expand **Use API key instead** to authenticate with an API key and user ID.

## Notes

- If your Jellyfin server blocks requests from this origin, enable CORS for `http://localhost:8067` in Jellyfin or your reverse proxy.
- Album art and audio stream directly from your Jellyfin server using your credentials.
- Optional: enable “Fetch lyrics from LRCLIB (online)” in the connection dialog to load lyrics on the fly.

## Contributing

See `CONTRIBUTING.md` and `AGENTS.md` for setup, style, and PR expectations.
