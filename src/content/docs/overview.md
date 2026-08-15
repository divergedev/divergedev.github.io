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
- **Security Hardened:** Finalizer-based teardown, RFC 7230 header validation, path traversal prevention, and constant-time secret comparison.

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
                     v              [PreviewGroup] -> [Environments]
             [Activator Proxy] 
                     |
              (Wake & Route)
                     v
             [Preview Deployment] (Delta, scalable to 0)
```

## Comparison

| Feature | Diverge | Full Namespace Clone | Signadot | Telepresence |
|---------|---------|----------------------|----------|--------------|
| Speed | Fast (Delta) | Slow | Fast | Fast (Local) |
| Cost | Lowest (Scale-to-Zero) | High | Medium (SaaS) | Medium (SaaS) |
| Open Source | Yes | N/A | No | Partial |

## Quality

Diverge is rigorously tested, featuring 147 tests across multiple packages to ensure robust preview environments, including Property-Based Testing (PBT) using the Hegel framework.

## Recently Shipped

- **KNative Router** — Previews scale to zero and wake automatically on traffic via Activator Proxy
- **SchemaProvider** — Automatically executes `CREATE SCHEMA IF NOT EXISTS` for seamless database isolation
- **PreviewGroups** — Higher-level CRD to manage all changed services for a single MR

## Roadmap (Coming Soon)

- **GitLab Commit Statuses** — Update MR status with preview environment deploy state
- **Multi-cluster support** — Deploy previews to remote clusters
- **Argo Rollouts integration** — Extended progressive delivery features
- **Preview environment metrics dashboard** — Visibility into cost savings and usage
