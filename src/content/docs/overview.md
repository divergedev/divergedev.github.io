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
- **Interactive PR/MR Slash Commands:** Trigger previews, run readiness/replay checks, extend TTLs, steer active agents, or adjust LLM budgets directly from GitHub/GitLab comments (`/diverge preview`, `/diverge verify`, `/diverge replay`, `/diverge fix`, `/diverge guide`, `/diverge budget`, `/diverge status`, `/diverge extend-ttl`, `/diverge teardown`, `/diverge pause`, `/diverge resume`).
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

- **FinOps Cost Attribution, Hibernation Savings & Usage Analytics (`v0.25`)** — Configurable unit rate cards (`DIVERGE_COST_*`), sleep/wake transition tracking (`divergedev.com/hibernated-at` / `divergedev.com/hibernated-seconds`), `ClusterService.GetCostSummary` with scoped `diverge_get_cost_summary` Macaroon authorization, Prometheus resource/savings/lifetime metrics, and the `/analytics` Web Dashboard
- **Native Helm Notifier Config & Opt-In Organization Webhooks (`v0.24`)** — `notifier.baseUrl`, `notifier.tokenSecretRef`, `extraArgs` / `extraEnv`, per-repo `.diverge.yaml` `image.repository` overrides, and automatic skipping of non-Diverge repositories under `serviceconfig`
- **Stateful Trace Chaining & Listener `h2c` Recording (`v0.23`)** — Per-environment `extract` rules (`$.nested.items[0].id`, `$header.<Name>`, `$status`) and `{{var}}` interpolation in `diverge replay` (`--sequential`) with `[REDACTED]` header-credential masking in reports, automatic CRUD ID chaining (`diverge record --auto-chain`), and listener HTTP/2 cleartext (`h2c`) + upstream trailer forwarding
- **Traffic Recording Proxy, Deep Trace Sanitization & Self-Healing (`v0.22`)** — `diverge record` reverse-proxy recorder, `diverge replay sanitize`, fail-closed query/JSON body field redaction, `--auto-fix` / `--fix` self-healing `AgentTask` dispatch, and the Web Dashboard **Verify & Replay** tab (`POST /api/v1/environments/verify` & `/api/v1/environments/replay`)
- **HAR/Multi-Cookie Replay Hardening & Multi-Service Verification (`v0.21`)** — Browser/Playwright `.har` trace import, host wildcard filtering (`--filter-host`), automatic `diverge_env` sticky-cookie stripping on multi-cookie headers, and per-service `PreviewGroup` verification probes
- **Deterministic Traffic Replay & Contract Diffing (`v0.20`)** — `diverge replay` CLI and `diverge_replay` MCP tool for replaying `.jsonl`, `.har`, and `.json` traces against baseline and preview environments with HTTP/gRPC status parity, p50/p95 latency reporting, per-request latency thresholds, JSON schema diffing, and binary Protobuf wire/descriptor contract diffing
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
