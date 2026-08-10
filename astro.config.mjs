import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://divergedev.com',
  integrations: [
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
            { label: 'Delta Deployments', slug: 'concepts/delta-deployments' },
            { label: 'Routing Modes', slug: 'concepts/routing' },
            { label: 'Database Modes', slug: 'concepts/database' },
            { label: 'Lifecycle', slug: 'concepts/lifecycle' },
            { label: 'Merge Gating', slug: 'concepts/merge-gating' },
            { label: 'Namespace Labels', slug: 'concepts/namespace-labels' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'GitLab Integration', slug: 'guides/gitlab' },
            { label: 'GitHub Integration', slug: 'guides/github' },
            { label: 'Argo CD', slug: 'guides/argocd' },
            { label: 'CLI Reference', slug: 'guides/cli' },
          ],
        },
        {
          label: 'Architecture',
          items: [
            { label: 'Overview', slug: 'architecture/overview' },
            { label: 'CRD Reference', slug: 'architecture/crd' },
          ],
        },
      ],
    }),
  ],
});
