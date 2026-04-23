# Netlify Functions Deploy

This project is now prepared to run the frontend and API on the same Netlify site by using Netlify Functions.

## Architecture

- the frontend is published from `dist/`
- the API runs as `netlify/functions/api.ts`
- `/api/*` requests are rewritten by `netlify.toml`
- Bunny.net and Patreon secrets stay in Netlify environment variables

## Required Netlify environment variables

- `BUNNY_LIBRARY_ID`
- `BUNNY_STREAM_ACCESS_KEY`
- `PATREON_CLIENT_ID`
- `PATREON_CLIENT_SECRET`
- `PATREON_CREATOR_ACCESS_TOKEN`
- `SESSION_SIGNING_SECRET`
- `PATREON_REDIRECT_URI`
- `FRONTEND_BASE_URL`
- `FRONTEND_ALLOWED_ORIGINS`
- `COOKIE_SECURE`
- `COOKIE_SAME_SITE`

Recommended production values:

```env
PATREON_REDIRECT_URI="https://your-site.netlify.app/api/auth/patreon/callback"
FRONTEND_BASE_URL="https://your-site.netlify.app"
FRONTEND_ALLOWED_ORIGINS="https://your-site.netlify.app"
COOKIE_SECURE="true"
COOKIE_SAME_SITE="Lax"
VITE_API_BASE_URL=""
```

## Patreon configuration

In Patreon developer settings, register the same callback URL used in `PATREON_REDIRECT_URI`.

Example:

```text
https://your-site.netlify.app/api/auth/patreon/callback
```

## Deploy steps

1. Create the site in Netlify from this project, not from `dist` alone.
2. Keep `netlify.toml` in the project root.
3. Add the environment variables in the Netlify dashboard.
4. Run the Netlify deploy so it builds the frontend and bundles the functions.

## Local development

You can still run the local Express server for development:

```bash
npm run dev:server
```

And the frontend:

```bash
npm run dev
```

## Important

Uploading only the generated `dist/` folder will publish the frontend, but it will not upload or build the Netlify Functions source.

To use Bunny + Patreon on Netlify, the deploy must include the project files so Netlify can build `netlify/functions/api.ts`.
