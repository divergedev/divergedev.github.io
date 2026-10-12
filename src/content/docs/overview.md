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
- **Autonomous Agent Sandboxes (`AgentTask`):** Isolated Kubernetes sandboxes (`gvisor` / `kata` / `agent-sandbox`) with attenuated Macaroon capability tokens, automatic linked preview environments, and live LLM token/cost metering (`POST /api/v1/agenttask/meter`).
- **Interactive PR/MR Slash Commands:** Trigger previews, extend TTLs, or dispatch autonomous AI fixes directly from GitHub/GitLab comments (`/diverge preview`, `/diverge fix`, `/diverge extend-ttl`, `/diverge teardown`, `/diverge pause`, `/diverge resume`).
- **Delta Deployments:** Deploy only what has changed instead of an entire microservice stack.
- **Routing Modes:** Uses header-based or subdomain routing to share baseline environments.
- **Security Hardened:** Macaroon capability tokens, finalizer-based teardown, RFC 7230 header validation, path traversal prevention, and constant-time secret comparison.

## Architecture

```text
       [Developer / AI Agent] -- (Git Push / Slash Cmd / MCP) --> [GitHub/GitLab / Server]
                                                                            |
                                                                 (Webhook / ConnectRPC)
                                                                            v
[Traffic] --> (Ingress/Gateway) --> [Diverge Controller] -----> [AgentTask Sandbox]
                     |                     |                     (Macaroon + Metering)
                     +-- (Header match)    +-- (Creates)
                     |                     v
                     v              [PreviewGroup] -> [Environments]
             [Activator Proxy]
                     |
        (Wake Splash & Route)
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

Diverge is rigorously tested across packages to ensure robust preview environments, including Property-Based Testing (PBT) using the Hegel framework.

## Recently Shipped

- **Autonomous Agent Sandboxes (`AgentTask`)** — Isolated coding agent pods with Macaroon capability tokens, automatic linked preview environments (`spec.createPreview: true`), and live LLM cost/token metering (`POST /api/v1/agenttask/meter`)
- **Interactive PR/MR Slash Commands** — Manage environments and trigger AI fixes via `/diverge preview`, `/diverge fix`, `/diverge extend-ttl`, `/diverge teardown`, `/diverge pause`, and `/diverge resume`
- **Built-in MCP Server & Web Dashboard** — Both remote HTTP (`/mcp`) and CLI stdio (`diverge mcp`) MCP servers, plus an embedded React Web Dashboard with OIDC SSO
- **Activator Wake-Up Splash Page & Idle Hibernation** — Browser-friendly `202 Accepted` auto-refreshing splash screen (`--wake-splash`) during cold starts, idle hibernation (`divergedev.com/hibernate-after`), and Prometheus preview cost estimation (`diverge_environment_estimated_hourly_cost_usd`)
- **GitLab & GitHub Commit Statuses** — Automated `diverge/preview` merge gating across both GitHub and GitLab
- **Knative & KEDA Scale-to-Zero** — Previews scale to zero and wake automatically on traffic via Activator Proxy
- **SchemaProvider & Ariga Atlas** — Automated `CREATE SCHEMA IF NOT EXISTS` with per-schema roles and declarative/versioned Atlas migrations
- **PreviewGroups** — Higher-level CRD to manage all changed services for a single MR/PR

## Roadmap (Coming Soon)

- **Multi-cluster support** — Deploy previews across federated remote clusters
- **Argo Rollouts integration** — Extended progressive delivery and canary analysis features
