---
title: CLI Reference
description: Diverge CLI commands
---

The Diverge CLI provides tools to interact with your preview environments directly from your terminal.

## Commands

### `diverge create`
Create an environment from the current branch.

### `diverge curl <env> [path]`
Send an HTTP request routed to a preview `Environment` or `PreviewGroup` (automatically injecting `x-diverge-env` and W3C `baggage`).
- `--compare-baseline` — Send an unrouted baseline request and display status code, latency, and body diffs side-by-side
- `-X, --method` — HTTP method (default: `GET`)
- `-H, --header` — Additional HTTP headers (`Key: Value`, repeatable)
- `-d, --data` — HTTP request body payload
- `--base-url` — Override target base URL

### `diverge delete <name>`
Delete an environment.

### `diverge dev [flags]`
Route cluster traffic to your local machine via an authenticated reverse tunnel.
- `--service` — Service name (default: auto-detect)
- `--port` — Local port (default: 8080)
- `--endpoint` — Local endpoint IP (default: tailscale ip -4)
- `--token` — Bearer token for server authentication (can also be set via `DIVERGE_TOKEN`; automatically falls back to current `kubeconfig` user token)
- `--env-output` — inject (in-memory) or file (.env.diverge) (default: inject)
- `--devspace` — Generate devspace.yaml template


### `diverge dev intercept <service>`
Intercept a service.

### `diverge dev release <service>`
Stop intercepting.

### `diverge diff`
Detect which services changed relative to a base branch.
- `--config` — Path to .diverge.yaml
- `--base` — Base ref (default: main)
- `--output` — Output format: text, json

### `diverge doctor [env-name]`
Run automated root-cause diagnostics (`DIV-101`–`DIV-110`) across workloads, database migrations, and `AgentTask` sandboxes.
- `--json` — Output machine-readable JSON diagnostic report

### `diverge env export`
Export env vars (dotenv, json, shell).

### `diverge graph show`
Display the service topology graph.
- `--config` — Path to .diverge.yaml
- `--output` — Output format: text, mermaid, dot, json
- `--gateway` — Filter to specific gateway

### `diverge graph validate`
Validate topology for cycles, orphans, and unreachable services.
- `--config` — Path to .diverge.yaml

### `diverge init`
Initialize a `.diverge.yaml` configuration (`--config`) or bootstrap a local dev playground (`--provider auto|kind|k3d|existing`).

### `diverge list`
List all environments.

### `diverge logs [env-name]`
Stream logs.

### `diverge mcp`
Run MCP server over stdio for AI agent integration.

### `diverge mcp setup`
Configure `diverge mcp` automatically for AI coding assistants using atomic file replacement that preserves existing MCP server entries.
- `--client` — Target AI client: `all` (default: writes `.cursor/mcp.json`, `.mcp.json`, and `~/.codeium/windsurf/mcp_config.json`), `cursor`, `claude`, or `windsurf`
- `--server-url` — Diverge API server URL to embed in the MCP config
- `--allow-destructive` — Include `--allow-destructive` in the configured `diverge mcp` arguments
- `--dir` — Target workspace directory (default: `.`)

### `diverge open <name>`
Open a preview `Environment` or `PreviewGroup` URL in your browser.
- `-m, --magic` — Append `?_diverge_env=<headerValue>` so `diverge-proxy` sets the `diverge_env` sticky routing cookie on first visit
- `-p, --no-browser` — Print the resolved URL to stdout without launching a browser

### `diverge plugins`
Manage plugins.

### `diverge preview create`
Create preview group.

### `diverge preview delete <name>`
Delete preview group.

### `diverge preview status <name>`
Preview group status.

### `diverge preview watch <name>`
Watch until Ready/Failed.

### `diverge providers list`
List providers.

### `diverge route <service>`
Simulate request routing through the topology.
- `--config` — Path to .diverge.yaml
- `--gateway` — Filter to specific gateway
- `--header` — Custom header name
- `--output` — Output format: text, mermaid, dot, json
- `--live` — Use Prometheus for live topology

### `diverge status`
Show active envs and groups.

### `diverge top`
Live terminal dashboard (alias: `diverge watch`) displaying fleet FinOps hourly and monthly burn rates, environment states (`💤 hibernated` when scaled to zero, `⚠️ drift` for active baseline-drifted environments, or `active`), `PreviewGroup` service counts, TTL countdowns, and `AgentTask` LLM token/cost spend.
- `--interval` — Refresh interval (default: `2s`)
- `--once` — Render a single snapshot to stdout and exit without clearing the screen
- `-A, --all-namespaces` — Query across all namespaces

### `diverge validate`
Validate `.diverge.yaml` against JSON Schema or print the embedded schema (`--print-schema`).

### `diverge verify <env-name> [path-or-url]`
Run a unified verification suite against a preview `Environment` or `PreviewGroup` combining Kubernetes workload diagnostics (`doctor`), routed HTTP readiness probes (with automatic `x-diverge-env` and W3C `baggage` injection), latency SLO assertions, response body substring checks, and optional baseline parity comparisons.
- `--path` — HTTP path(s) to probe (repeatable, default: `["/"]`)
- `--expect-status` — Expected HTTP status code (default: `0`, accepting any `2xx`/`3xx` status `< 400`; set e.g. `200` to require an exact status code)
- `--max-latency` — Maximum acceptable preview response latency (e.g., `500ms`)
- `--body-contains` — Substring that must appear in the preview HTTP response body
- `--compare-baseline` — Probe baseline (without preview routing headers) and verify HTTP status code parity
- `--fail-on-status-diff` — Fail verification if baseline and preview HTTP status codes differ when `--compare-baseline` is enabled (default: `true`)
- `--skip-doctor` — Skip Kubernetes workload health diagnostics (`doctor`)
- `--json` — Output machine-readable JSON verification report
- `--base-url` — Override the base URL for HTTP verification
- `-X, --method`, `-d, --data`, `-H, --header`, `--timeout` — Request method, body, custom headers, and per-request timeout (default: `15s`)

```bash
# Verify cluster workload health, /healthz endpoint, baseline status parity, and a 500ms latency SLO
diverge verify pr-42 --path /healthz --compare-baseline --max-latency 500ms

# Verify against an explicit gateway URL in CI and emit a JSON report
diverge verify pr-42 /api/status --base-url https://preview.example.com --body-contains '"ok":true' --json
```

### `diverge version`
Print version.


