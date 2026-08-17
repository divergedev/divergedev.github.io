import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://divergedev.com',
  integrations: [
    mermaid(),
    starlight({
      title: 'Diverge',
      description: 'Open-source environment-as-a-service for Kubernetes. Delta deployments, header-based routing, and automatic teardown.',
      logo: {
        dark: './src/assets/logo-dark.png',
        light: './src/assets/logo-light.png',
        replacesTitle: false,
      },
      social: [
        { label: 'GitHub', icon: 'github', href: 'https://github.com/divergedev/diverge' },
      ],
      customCss: ['./src/styles/custom.css'],
      head: [
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://divergedev.com/og.png' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        },
        {
          tag: 'link',
          attrs: { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap' },
        },
      ],
      sidebar: [
        { label: 'Overview', slug: 'overview' },
        {
          label: 'Getting Started',
          items: [
            { label: 'Quick Start', slug: 'getting-started/quickstart' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Configuration', slug: 'getting-started/configuration' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Routing Modes', slug: 'concepts/routing' },
            { label: 'Lifecycle', slug: 'concepts/lifecycle' },
            { label: 'PreviewGroups', slug: 'concepts/previewgroup' },
            { label: 'Database Modes', slug: 'concepts/database' },
            { label: 'Delta Deployments', slug: 'concepts/delta-deployments' },
            { label: 'Merge Gating', slug: 'concepts/merge-gating' },
            { label: 'Namespace Labels', slug: 'concepts/namespace-labels' },
            { label: 'Scale to Zero', slug: 'concepts/scale-to-zero' },
            { label: 'Async Routing', slug: 'concepts/async-routing' },
            { label: 'Observability', slug: 'concepts/observability' },
          ],
        },
        {
          label: 'Guides',
          items: [
            {
              label: 'CI/CD',
              items: [
                { label: 'GitHub Integration', slug: 'guides/github' },
                { label: 'GitLab Integration', slug: 'guides/gitlab' },
                { label: 'Argo CD', slug: 'guides/argocd' },
              ],
            },
            {
              label: 'Dev Workflow',
              items: [
                { label: 'CLI Reference', slug: 'guides/cli' },
                { label: 'Hot Reload', slug: 'guides/hot-reload' },
                { label: 'DevSpace Integration', slug: 'guides/devspace' },
                { label: 'Environment Export', slug: 'guides/env-export' },
                { label: 'Preview Banner', slug: 'guides/preview-banner' },
              ],
            },
            {
              label: 'API',
              items: [
                { label: 'Server API', slug: 'guides/server' },
              ],
            },
            {
              label: 'Routing & Networking',
              items: [
                { label: 'Multi-Repo', slug: 'guides/multi-repo' },
                { label: 'Authentication', slug: 'guides/auth' },
                { label: 'Provider Registry', slug: 'guides/provider-registry' },
                { label: 'Async Routing', slug: 'guides/async-routing' },
                { label: 'Sticky Routing', slug: 'guides/sticky-routing' },
                { label: 'WebSocket', slug: 'guides/websocket' },
              ],
            },
            {
              label: 'Observability',
              items: [
                { label: 'Observability', slug: 'guides/observability' },
              ],
            },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Overview', slug: 'architecture/overview' },
            { label: 'Server Architecture', slug: 'architecture/server' },
            { label: 'CRD Reference', slug: 'architecture/crd' },
          ],
        },
        {
          label: 'Blog',
          items: [
            { label: 'Why We Killed the .env File', slug: 'blog/why-we-killed-the-env-file' },
          ],
        },
      ],
    }),
  ],
});
