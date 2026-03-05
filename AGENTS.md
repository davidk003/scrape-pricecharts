# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Pokemon Trading Card Price Scraper — a SvelteKit web app (`scraper-site/`) that scrapes card pricing data from PriceCharting.com and lets users download results as CSV. There are also optional root-level Node.js scraping scripts and Python data-processing scripts.

### Key services

| Service | How to run | Port |
|---|---|---|
| SvelteKit dev server | `cd scraper-site && npm run dev` | 5173 |

### Lint / type-check / build

All commands run from `scraper-site/`:

- **Type check:** `npm run check` (runs `svelte-kit sync && svelte-check`)
- **Build:** `npm run build`
- No ESLint or Prettier config exists in this repo.

### Non-obvious notes

- The repo has two separate `package.json` / `package-lock.json` trees: root (cheerio for standalone scripts) and `scraper-site/` (SvelteKit app). Both need `npm install`.
- The `/scrape` endpoint fetches live data from PriceCharting.com — internet access is required for the scraper to function.
- The build warns about `@sveltejs/adapter-auto` not detecting a production environment; this is expected in dev and does not affect `npm run dev`.
- No database is used; all data is in flat CSV/JSON files committed to the repo.
- Python scripts (`AnalyzePC&TCG.py`, etc.) are optional offline data processing and require `pandas`, `unidecode`, `requests`. They are not needed for the web UI.
