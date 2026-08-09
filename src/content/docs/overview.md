---
title: Overview
description: Overview of Diverge
---

Diverge is an open-source environment-as-a-service engine for Kubernetes. It allows platform engineers, DevOps, and developers to easily create and manage preview environments.

## Who is it for?
- **Platform Engineers & DevOps:** Eliminate duplicate staging clusters and reduce cloud costs by using shared baselines.
- **Developers:** Get instant preview environments for every pull request without waiting for CI pipelines or staging slots.

## Key Concepts

- **Environment CRD:** Declarative Kubernetes resource defining a preview environment.
- **Delta Deployments:** Deploy only what has changed instead of an entire microservice stack.
- **Routing Modes:** Uses header-based routing to share baseline environments.

## Architecture

```text
       [Developer] -- (Git Push) --> [GitHub/GitLab]
                                           |
                                      (Webhook)
                                           v
[Traffic] --> (Ingress/Gateway) --> [Diverge Controller]
                     |                     |
                     +-- (Header match)    +-- (Creates)
                     |                     v
                     v              [Preview Deployment] (Delta)
              [Baseline Svc]
```

## Comparison

| Feature | Diverge | Full Namespace Clone | Signadot | Telepresence |
|---------|---------|----------------------|----------|--------------|
| Speed | Fast (Delta) | Slow | Fast | Fast (Local) |
| Cost | Low | High | Medium (SaaS) | Medium (SaaS) |
| Open Source | Yes | N/A | No | Partial |
