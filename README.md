# vindy-docs

Customer-facing API documentation for the **Vindy** platform. Built with [Docusaurus](https://docusaurus.io/).

- **Languages:** English (default) and Turkish (`/tr/`)
- **Theme:** light / dark / system, switchable from the navbar
- **Content:** Quickstart, Authentication, Concepts, API Reference, Error Codes, Guides, FAQ, Glossary
- **OpenAPI:** the spec lives at `static/openapi/openapi.yaml` and is served at `/openapi/openapi.yaml`

## Requirements

- Node.js >= 18

> **Note:** `package.json` pins `webpack` to `5.97.1` via `overrides`. Docusaurus 3.7.0 is incompatible with webpack >= 5.99 (ProgressPlugin options validation error on build). Do not remove the override unless Docusaurus itself is upgraded.

## Installation

```bash
npm install
```

## Local Development

```bash
npm run start
```

Starts a local dev server at `http://localhost:3011` and opens a browser window. Most changes are reflected live without restarting the server.

By default the dev server runs only the default locale (English). To preview the Turkish locale:

```bash
npm run start -- --locale tr
```

## Build

```bash
npm run build
```

Generates static content for **all locales** into the `build` directory. Serve it locally to verify:

```bash
npm run serve
```

## Translations

Turkish content mirrors the English docs:


| English                           | Turkish                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `docs/**/*.md`                    | `i18n/tr/docusaurus-plugin-content-docs/current/**/*.md` |
| Theme UI strings                  | `i18n/tr/code.json`                                      |
| Navbar / footer labels            | `i18n/tr/docusaurus-theme-classic/*.json`                |
| Version + sidebar category labels | `i18n/tr/docusaurus-plugin-content-docs/current.json`    |


When you add a new English page, add its Turkish counterpart at the same relative path under `i18n/tr/docusaurus-plugin-content-docs/current/`.

## Deployment

> The production domain is pending final confirmation. Update `url` in `docusaurus.config.ts` once DNS is settled.

### Docker (default)

The repository ships with a multi-stage `Dockerfile` (Node build → nginx serve) and a `docker-compose.yml` that maps host port **3011** to the container's port 80:

```bash
docker compose up -d --build
# site available on http://localhost:3011
```

Or manually:

```bash
docker build -t vindy-docs .
docker run -p 3011:80 vindy-docs
```

### Static hosting alternatives

`npm run build` produces a fully static site in `build/`. Any static host works:

- **Vercel** — framework preset "Docusaurus", build command `npm run build`, output directory `build`
- **Netlify** — build command `npm run build`, publish directory `build`
- **Cloudflare Pages** — build command `npm run build`, output directory `build`

No server-side runtime is required.