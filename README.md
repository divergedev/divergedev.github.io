# Diverge Documentation & Website (`divergedev.com`)

Official documentation and marketing site for **[Diverge](https://github.com/divergedev/diverge)** — the 100% open-source (Apache-2.0) Kubernetes Environment & Autonomous Agent Sandbox Engine.

- **Live Site**: [https://divergedev.com](https://divergedev.com)
- **Main Repository**: [github.com/divergedev/diverge](https://github.com/divergedev/diverge)
- **Framework**: [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) + [Pagefind](https://pagefind.app)

## Project Structure

```text
.
├── public/                 # Static assets & CLI installer (https://divergedev.com/install.sh)
├── src/
│   ├── assets/             # Logos and images
│   ├── content/
│   │   └── docs/           # Markdown & MDX documentation pages
│   │       ├── index.mdx
│   │       ├── overview.md
│   │       ├── getting-started/
│   │       ├── concepts/
│   │       ├── guides/
│   │       ├── architecture/
│   │       └── blog/
│   └── styles/
│       └── custom.css      # Starlight theme & landing page styling
├── astro.config.mjs        # Site & sidebar navigation config
└── package.json
```

## Local Development

```bash
# Install dependencies
npm install

# Start local dev server at http://localhost:4321
npm run dev

# Build static site and Pagefind search index to ./dist/
npm run build

# Preview production build locally
npm run preview
```
