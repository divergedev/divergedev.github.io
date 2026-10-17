---
title: Quick Start (90-Second End-to-End Guide)
description: Spin up a delta preview environment, route traffic via Magic Links, compare baseline vs. preview responses, and run automated verification in 90 seconds.
---

Go from zero to an isolated, header-routed **delta preview environment** in 90 seconds. Diverge deploys only the services modified in your pull request while sharing unchanged baseline services, databases, and queues safely.

> **Want a full-stack banking sandbox?** Try the [5-minute bank demo](https://github.com/divergedev/demo) or run `./scripts/playground.sh up` — no existing cluster required, just Docker + Kind or k3d.

---

## Prerequisites

- **Diverge CLI**:
  ```bash
  curl -fsSL https://divergedev.com/install.sh | sh
  ```
- **Either** Docker (for the local playground) **or** `kubectl` + `helm` pointed at an existing Kubernetes cluster.

---

## Choose Your Environment Setup

### Option A — Local Playground (No Cluster Required)

Spin up a local Kind/k3d cluster with Gateway API CRDs, Envoy Gateway, baseline services, and the Diverge operator pre-installed. Run this from a separate terminal or temporary directory so your current shell stays in your application repository:

```bash
# Bootstrap directly from the CLI anywhere:
diverge init --provider auto

# Or clone the Diverge repo into a temporary directory (or try the 5-minute bank demo: https://github.com/divergedev/demo):
git clone https://github.com/divergedev/diverge.git /tmp/diverge
/tmp/diverge/scripts/playground.sh up
```

Once the local cluster is running, switch back to **your own application repository checkout** for Steps 1–3 below.

### Option B — Existing Kubernetes Cluster

Install the Diverge operator and L7 proxy into your cluster via the official OCI Helm chart:

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace
```

---

## Step 1: Initialize `.diverge.yaml`

From the root of **your application repository** (not the `/tmp/diverge` checkout), generate a starter configuration with `diverge init --config` or create a schema-compliant `.diverge.yaml`:

```bash
cd /path/to/your-app-repo
diverge init --config
```

```yaml
# .diverge.yaml
version: "1"

services:
  web:
    paths:
      - "apps/web/**"
    image:
      repository: "ghcr.io/myorg/web"
      tag_template: "pr-{{.MR}}"
    entrypoint: true
    dependsOn:
      - "api"
  api:
    paths:
      - "apps/api/**"
    image:
      repository: "ghcr.io/myorg/api"
      tag_template: "pr-{{.MR}}"

defaults:
  deploy:
    mode: delta
    namespace: same
  routing:
    mode: header
    header_key: x-diverge-env
  database:
    mode: schema
    seed_source: public
  lifecycle:
    ttl: 24h
    cleanup_on_merge: true
```

Validate your configuration against the embedded JSON Schema:

```bash
diverge validate
```

---

## Step 2: Create Your First Delta Preview

Deploy a delta preview environment (`pr-42`) that overrides only the `api` service while reusing the baseline `web` frontend and other unchanged services:

```bash
diverge preview create pr-42 \
  --branch feat/checkout-v2 \
  --service api=ghcr.io/myorg/api:pr-42
```

Check the environment status and live fleet resource usage:

```bash
# Inspect preview environment readiness, database schema, and routes
diverge status pr-42

# Render a single-frame FinOps & health snapshot of active previews
diverge top --once
```

---

## Step 3: Test & Compare Against Baseline

Once `pr-42` reaches `Ready`, you can test it in your browser, from the terminal, or in CI/CD pipelines.

### 1. Browser Magic Link & `<diverge-toolbar>`

Open the preview environment in your default browser without installing any browser extensions:

```bash
diverge open pr-42 --magic
```

This opens your application URL with `?_diverge_env=pr-42`. `diverge-proxy` exchanges the query parameter for an `HttpOnly` sticky session cookie (`diverge_env=pr-42`), redirects to the clean URL, and injects the floating **`<diverge-toolbar>`** Web Component in the bottom-right corner so you can switch environments or reset to baseline in one click.

### 2. Terminal Side-by-Side Comparison (`diverge curl`)

Send a request to `/api/checkout` and compare the preview response status, latency, and body side-by-side against the unrouted baseline:

```bash
diverge curl pr-42 /api/checkout --compare-baseline
```

### 3. Automated CI/CD Verification Gate (`diverge verify`)

Run a single verification command that combines Kubernetes workload diagnostics (`doctor`), routed HTTP readiness probes, baseline status parity, and latency SLO assertions:

```bash
diverge verify pr-42 --path /healthz --compare-baseline --max-latency 500ms
```

---

## Step 4: Clean Up

When you are finished testing (or automatically when your PR merges), delete the preview environment. Diverge tears down the delta deployment, `HTTPRoute` rules, and isolated `preview_pr_42` PostgreSQL schema:

```bash
diverge delete pr-42
```

*(If you started the local playground in Option A, run `/tmp/diverge/scripts/playground.sh down` — or `./scripts/playground.sh down` from the Diverge checkout — to remove the local cluster.)*

---

## Next Steps

- [Database Modes](/concepts/database/) — Learn how `SchemaDatabaseProvider` clones tables, foreign keys, views, and topologically ordered seed data.
- [Routing Modes](/concepts/routing/) — Configure Gateway API `parentRef` disambiguation, `external-dns`, and `cert-manager` annotations.
- [Async Routing Guide](/guides/async-routing/) — Isolate Kafka topics, Temporal queues, Redis/Valkey keyspaces, and S3/GCS/MinIO object storage prefixes.
- [CLI Reference](/guides/cli/) — Explore all commands and flags including `diverge verify`, `diverge curl`, and `diverge doctor`.
