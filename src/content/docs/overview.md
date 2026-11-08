---
title: Overview
description: Overview of Diverge
---

Diverge is an open-source environment-as-a-service engine for Kubernetes. It allows platform engineers, DevOps, and developers to easily create and manage preview environments.

![Diverge CLI Quickstart Session](/images/terminal-quickstart-demo.svg)

## Who is it for?
- **Platform Engineers & DevOps:** Eliminate duplicate staging clusters and reduce cloud costs by 90%+ using shared baselines, scale-to-zero hibernation, and FinOps namespace quotas.
- **Developers:** Get instant delta preview environments for every pull request without waiting for full-stack CI deploys or contested staging slots.
- **AI Engineers & Autonomous Agents:** Run spec-driven coding agents (`AgentTask` / `diverge task`) in isolated `gvisor` / `kata` / `agent-sandbox` pods with attenuated Macaroon capability tokens, automatic linked preview environments, and live LLM cost/token metering.

## Key Concepts

- **Environment CRD:** Declarative Kubernetes resource defining a preview environment.
- **Autonomous Agent Sandboxes (`AgentTask`):** Isolated Kubernetes sandboxes (`gvisor` / `kata` / `agent-sandbox` / `pod`) with attenuated Macaroon capability tokens, automatic linked preview environments (`divergedev.com/preview-enabled: "true"`), and idempotent live LLM token/cost metering (`POST /api/v1/agenttask/meter`).
- **Interactive PR/MR Slash Commands:** Trigger previews, extend TTLs, steer active agents, or adjust LLM budgets directly from GitHub/GitLab comments (`/diverge preview`, `/diverge fix`, `/diverge guide`, `/diverge budget`, `/diverge status`, `/diverge extend-ttl`, `/diverge teardown`, `/diverge pause`, `/diverge resume`).
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

![Traditional Full-Stack Duplication vs. Diverge Delta Preview](/images/delta-vs-duplicated.svg)

| Feature | Diverge | Full Namespace Clone | Signadot | Telepresence |
|---------|---------|----------------------|----------|--------------|
| Speed | Fast (Delta) | Slow | Fast | Fast (Local) |
| Cost | Lowest (Scale-to-Zero) | High | Medium (SaaS) | Medium (SaaS) |
| Open Source | Yes | N/A | No | Partial |

## Quality

Diverge is rigorously tested across packages to ensure robust preview environments, including Property-Based Testing (PBT) using the Hegel framework.

## Recently Shipped

- **Deterministic Traffic Replay & Contract Diffing (`v0.20`)** — `diverge replay` CLI and `diverge_replay` MCP tool for replaying `.jsonl`, `.har`, and `.json` traces against baseline and preview environments with HTTP/gRPC status parity, p50/p95 latency SLOs, JSON schema diffing, and binary Protobuf wire/descriptor contract diffing
- **Production AgentTask Sandboxes & `diverge task` CLI (`v0.19`)** — `.diverge/agent.yaml` repository config, `diverge task init|create|status|list|logs|guide|pause|resume|delete`, `SandboxSuspender` pod suspension + linked preview hibernation, and idempotent `requestId` LLM metering returning live `guidance` and `previewUrl`
- **Unified CI Verification & Full-Stack Data Isolation (`v0.18`)** — `diverge verify` SLO & baseline parity gate with `$GITHUB_STEP_SUMMARY`, S3/GCS/MinIO object storage prefix isolation, Redis/Valkey keyspace isolation, and topological PostgreSQL FK/view cloning
- **Autonomous Agent Sandboxes (`AgentTask`)** — Isolated coding agent pods with Macaroon capability tokens, automatic linked preview environments (`divergedev.com/preview-enabled: "true"`), and live LLM cost/token metering (`POST /api/v1/agenttask/meter`)
- **Interactive PR/MR Slash Commands** — Manage environments, steer running agents, and bump budgets via `/diverge preview`, `/diverge fix`, `/diverge guide`, `/diverge budget`, `/diverge status`, `/diverge extend-ttl`, `/diverge teardown`, `/diverge pause`, and `/diverge resume`
- **Built-in MCP Server & Web Dashboard** — Both remote HTTP (`/mcp`) and CLI stdio (`diverge mcp`) MCP servers, plus an embedded React Web Dashboard with OIDC SSO
- **Activator Wake-Up Splash Page & Idle Hibernation** — Browser-friendly `202 Accepted` auto-refreshing splash screen (`--wake-splash`) during cold starts, idle hibernation (`divergedev.com/hibernate-after`), and Prometheus preview cost estimation (`diverge_environment_estimated_hourly_cost_usd`)
- **GitLab & GitHub Commit Statuses** — Automated `diverge/preview` merge gating across both GitHub and GitLab
- **Knative & KEDA Scale-to-Zero** — Previews scale to zero and wake automatically on traffic via Activator Proxy
- **SchemaProvider & Ariga Atlas** — Automated `CREATE SCHEMA IF NOT EXISTS` with per-schema roles and declarative/versioned Atlas migrations
- **PreviewGroups** — Higher-level CRD to manage all changed services for a single MR/PR

## Roadmap (Coming Soon)

- **Multi-cluster support** — Deploy previews across federated remote clusters
- **Argo Rollouts integration** — Extended progressive delivery and canary analysis features
