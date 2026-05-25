# Fridge Inventory

A frontend-only kitchen inventory app built with React and Tailwind CSS. It stores everything in browser localStorage so it can deploy on GitHub Pages with no backend.

## Features

- Add and remove ingredients by category.
- Create custom categories and map them to pantry, fridge, freezer, or counter.
- Browse inventory by storage zone with simple filters.
- Copy a full recipe prompt for ChatGPT and open ChatGPT in a new tab.
- Export a JSON backup of the local inventory.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The Vite config uses `base: './'`, which keeps the static build compatible with GitHub Pages and other static hosts.

## GitHub Pages deployment

1. Push this project to a GitHub repository.
2. In GitHub, open `Settings > Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` and the included workflow will lint, build, and publish the `dist` folder automatically.

If you just enabled GitHub Pages, either rerun the latest `Deploy to GitHub Pages` workflow or push a new commit to trigger the first deployment.

Included workflow:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## Storage notes

- Data is stored per browser and per device.
- Clearing browser storage removes the local inventory.
- The app can copy the prompt and open ChatGPT, but browsers do not allow automatic pasting into ChatGPT.
