---
title: CLI Reference
description: Diverge CLI commands
---

The Diverge CLI provides tools to interact with your preview environments directly from your terminal.

## Commands

### `diverge completion [bash|zsh|fish|powershell]`
Generate shell autocompletion scripts with dynamic cluster-aware tab-completion for live `Environment` and `AgentTask` names.

### `diverge create`
Create an environment from the current branch.
- `--mr` — Merge/Pull Request ID
- `--branch` — Override git branch name
- `--ttl` — Environment time-to-live (e.g. `4h`, `24h`)
- `--atlas-dir`, `--atlas-schema`, `--atlas-mode`, `--atlas-engine`, `--atlas-blocking` — Ariga Atlas schema migration bundling flags

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
Intercept a service in a preview group.

### `diverge dev release <service>`
Stop intercepting a service.

### `diverge dev sessions`
List active developer sessions and heartbeat leases across services in the cluster (alias: `diverge dev list`).

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
- When `--config` is passed, `diverge init` automatically scans `package.json`, `go.mod`, `pyproject.toml`, `requirements.txt`, `atlas.hcl`, `docker-compose.yml`, and `migrations/` to detect PostgreSQL (`database.mode: schema`, `seed_source: public`) and async/storage dependencies (`redis`, `s3`/`gcs`, `kafka`, `temporal`).

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

### `diverge record [env-name] --target <upstream-url> --output <trace.jsonl>`
Start a local reverse-proxy recorder (accepting HTTP/1.1 and HTTP/2 cleartext `h2c` client connections on its listener) that forwards incoming HTTP, ConnectRPC, gRPC-Web, binary Protobuf-over-HTTP, and non-streaming gRPC requests (including upstream HTTP/2 trailers over `https://` targets) to an upstream target URL (or a Diverge preview environment's gateway URL with automatic routing header injection) and writes a deterministic `.jsonl` trace for `diverge replay`. Upstream `http://` targets use HTTP/1.1 rather than cleartext HTTP/2 (`h2c`), so native gRPC services requiring upstream `h2c` cannot be recorded through it; streaming gRPC is also unsupported because the recorder buffers the entire request body before forwarding upstream.
- `-t, --target` — Upstream HTTP target URL to proxy and record (optional when `[env-name]` is provided)
- `-l, --listen` — Local address for the recording reverse proxy (default: `127.0.0.1:8095`)
- `-o, --output` — Output JSONL trace file path, or `-` for stdout (default: `trace.jsonl`)
- `--strip-auth` — Strip `Authorization`, `Proxy-Authorization`, `Cookie`, and `X-Api-Key` headers, URL userinfo, and default auth query tokens (default: `true`)
- `--strip-header` — Additional request header name to strip before recording (repeatable)
- `--redact-query` — Additional query parameter name to redact with `[REDACTED]` (repeatable)
- `--redact-body-field` — JSON request body field name or dot-path to redact with `[REDACTED]` (repeatable, e.g., `password,$.user.ssn`)
- `--auto-chain` — Automatically extract top-level `id` or `uuid` fields from `2xx` `POST`/`PUT` JSON responses (nested fields such as `data.id` are not auto-detected) and parameterize subsequent request paths with `{{stepN_id}}` (for `id`) or `{{stepN_uuid}}` (for `uuid`)
- `--max-requests` — Stop recording automatically after capturing `N` requests (`0` = unlimited)
- `-d, --duration` — Stop recording automatically after this duration (e.g., `30s`)

:::caution[Redaction Limits Before Committing Traces]
By default (`--strip-auth=true`), `diverge record` strips `Authorization`, `Proxy-Authorization`, `Cookie`, and `X-Api-Key` headers, URL userinfo, and default auth query tokens. **JSON request body fields are not redacted by default** — pass `--redact-body-field <field>` (e.g., `--redact-body-field password,cvv`) to scrub sensitive JSON fields, and note that binary request bodies (`application/proto`, `application/octet-stream`) are captured as base64 and cannot be field-redacted.
:::

```bash
# Record 20 requests against staging and scrub auth + sensitive JSON body fields
diverge record --target https://staging.example.com --output ./traces/checkout.jsonl --max-requests 20 --redact-body-field password,cvv

# Record CRUD traffic against pr-42 for 30s and auto-chain dynamic top-level IDs
diverge record pr-42 --output ./traces/pr-42.jsonl --duration 30s --auto-chain
```

### `diverge replay <env-name> --from <trace.jsonl|trace.har|trace.json>`
Replay recorded HTTP, ConnectRPC, and Protobuf/gRPC traffic traces against both baseline (unrouted) and a candidate preview `Environment` or `PreviewGroup` (with `x-diverge-env` and W3C `baggage` injected). Compares HTTP and gRPC status code parity, p50/p95 latency, JSON structural schemas, and binary Protobuf wire tags (or typed `.binpb` descriptors). Automatically strips recorded `diverge_env` sticky-routing cookies from both baseline and preview `Cookie` headers while preserving non-routing cookies. Trace entries also support stateful multi-step variable chaining via `extract` rules (`$.nested.items[0].id`, `$header.<Name>` / `header:<Name>`, `$status`) and `{{var}}` interpolation across subsequent request paths, headers, and bodies using isolated per-environment variable stores (masking header-extracted values with `[REDACTED]` in `EntryResult.ExtractedVars`, though values interpolated into `EntryResult.Path` are not masked—avoid placing credentials in URL paths).

**Subcommands:**
- `diverge replay sanitize --from <trace.har|trace.json|trace.jsonl> [--output <clean.jsonl>]` — Convert and scrub a raw trace offline (`--strip-auth` default `true`, `--strip-header`, `--redact-query`, `--redact-body-field`, `--filter-host`) into a deterministic `.jsonl` file.

**Flags:**
- `-f, --from` — Path to request trace file (`.jsonl`, `.har`, `.json`, or `-` for stdin; required)
- `--base-url` — Override baseline gateway URL (rewrites relative paths and captured URLs in the trace to this scheme and host; pair with `--filter-host` on multi-host `.har` files)
- `--preview-url` — Optional separate preview base URL (for subdomain-routed environments)
- `--header-key`, `--header-value` — Override routing header key (default: `x-diverge-env`) and value (default: environment name)
- `-c, --concurrency` — Number of concurrent replay workers (default: `4`)
- `--sequential` — Execute trace entries strictly sequentially in trace order (automatically enabled when entries use `extract` or `{{var}}` chaining)
- `--timeout` — Per-request HTTP timeout (default: `15s`)
- `--max-latency` — Maximum acceptable preview response latency per request (e.g., `500ms`)
- `--compare-values` — Compare exact scalar values in addition to JSON/Protobuf field types and wire schema
- `--fail-on-extra-fields` — Treat newly added JSON keys or Protobuf tags in preview as breaking
- `--fail-on-status-diff` — Fail if baseline and preview HTTP status codes differ (default: `true`)
- `--fail-on-contract-diff` — Fail if breaking JSON or Protobuf contract diffs are detected (default: `true`)
- `--ignore-field` — Field name or path to ignore during diffing (repeatable, e.g., `--ignore-field request_id`)
- `--filter-host` — Retain only trace entries matching the given hostname or wildcard pattern (repeatable, e.g., `--filter-host api.example.com --filter-host '*.example.com'`)
- `--strip-header` — Request header name to strip before replaying (repeatable, e.g., `--strip-header X-Internal-Token`)
- `--strip-auth` — Strip `Authorization`, `Proxy-Authorization`, `Cookie`, and `X-Api-Key` headers, URL userinfo, and default auth query tokens before replaying (default: `false`)
- `--redact-query` — Query parameter name to redact with `[REDACTED]` before replaying (repeatable)
- `--redact-body-field` — JSON request body field name or dot-path to redact with `[REDACTED]` before replaying (repeatable)
- `--proto-descriptor` — Optional path to compiled Protobuf `FileDescriptorSet` (`.binpb`) for schema-aware decoding
- `--proto-message` — Default fully-qualified Protobuf message type for response decoding
- `--auto-fix` — Automatically create or update a self-healing `AgentTask` (`autofix-replay-<env>`) when contract replay fails
- `--github-summary` — Write Markdown replay report to `$GITHUB_STEP_SUMMARY` (or stdout, or stderr when `--json` is set)
- `--json` — Output machine-readable JSON replay report

```bash
# Sanitize a browser HAR export offline — always inspect ./traces/checkout.jsonl afterward
# and pass additional --strip-header, --redact-query, and --redact-body-field flags (e.g., email,
# custom auth headers, or unlisted query parameters) for any remaining sensitive data before committing
diverge replay sanitize --from ./recording.har --output ./traces/checkout.jsonl --filter-host api.example.com --redact-body-field password,cvv

# Replay a JSONL request trace against preview environment pr-42
diverge replay pr-42 --from ./traces/checkout.jsonl

# Replay a multi-host HAR file filtered to api.example.com with auth stripping and GitHub Step Summary
diverge replay pr-42 --from ./recording.har --filter-host api.example.com --strip-auth --base-url https://staging.example.com --github-summary

# Replay binary Protobuf/gRPC traffic with a compiled FileDescriptorSet (.binpb)
diverge replay pr-42 --from ./grpc-trace.jsonl --proto-descriptor ./descriptors.binpb --proto-message acme.v1.ChargeResponse
```

:::caution
- **Side Effects & Unsanitized Request Data**: Unlike `diverge record` and `diverge replay sanitize`, `diverge replay` defaults `--strip-auth` to `false`, forwarding recorded headers and bodies unless scrubbing flags are set, and executes the preview request whenever baseline execution completes without transport/size error (up to the 10 MiB response cap). Always target safe environments, sanitize traces before committing (`diverge replay sanitize`), or pass `--strip-auth`, `--strip-header`, `--redact-query`, and `--redact-body-field` at replay time.
- **`--base-url` on Multi-Host HAR Files**: Passing `--base-url` redirects every captured URL in the trace to the specified host. Always filter multi-host browser HAR captures with `--filter-host` before replay so unrelated third-party requests are excluded.
:::

### `diverge route <service>`
Simulate request routing through the topology.
- `--config` — Path to .diverge.yaml
- `--gateway` — Filter to specific gateway
- `--header` — Custom header name
- `--output` — Output format: text, mermaid, dot, json
- `--live` — Use Prometheus for live topology

### `diverge status [name]`
Show active preview environments and groups.

### `diverge task`
Create and manage spec-driven autonomous AI developer tasks (`AgentTask` CRDs) in isolated Kubernetes sandboxes:
- `diverge task init [--force]` — Scaffold `.diverge/agent.yaml` in your repository
- `diverge task create "<objective>"` — Create an `AgentTask` (`--name`, `--repo`, `--base-branch`, `--budget`, `--iterations`, `--capabilities`, `--pool`, `--template`, `--dry-run`, `-o/--output text|yaml|json`; default: `text`)
- `diverge task list` — List `AgentTask` resources in the namespace
- `diverge task status <name>` — Show phase (`Pending`, `Provisioning`, `Active`, `Pausing`, `Paused`, `Completed`, `Failed`), iteration progress, token/USD spend, and linked preview URL
- `diverge task logs <name> [-f]` — Stream live execution logs from the sandbox pod
- `diverge task guide <name> "<guidance>"` — Send real-time steering instructions (`divergedev.com/guidance`) delivered on the next metering heartbeat
- `diverge task pause <name>` — Pause an active `AgentTask` (`spec.suspended: true`), revoke its Macaroon token, suspend its sandbox (`operatingMode: Suspended`), and hibernate its linked preview environment
- `diverge task resume <name> [--budget +10.00] [--tokens 500000]` — Resume a paused `AgentTask` with optional additive budget bumps and mint a fresh Macaroon capability token
- `diverge task delete <name>` — Delete an `AgentTask` and tear down its sandbox and linked preview

### `diverge top`
Live terminal dashboard (alias: `diverge watch`) displaying fleet FinOps hourly and monthly burn rates, environment states (`💤 hibernated` when scaled to zero, `⚠️ drift` for active baseline-drifted environments, or `active`), `PreviewGroup` service counts, TTL countdowns, and `AgentTask` LLM token/cost spend.
- `--interval` — Refresh interval (default: `2s`)
- `--once` — Render a single snapshot to stdout and exit without clearing the screen
- `-A, --all-namespaces` — Query across all namespaces

### `diverge validate`
Validate `.diverge.yaml` against JSON Schema or print the embedded schema (`--print-schema`).

### `diverge verify <env-name> [path-or-url]`
Run a unified verification suite against a preview `Environment` or `PreviewGroup` combining Kubernetes workload diagnostics (`doctor`), routed HTTP readiness probes (with automatic `x-diverge-env` and W3C `baggage` injection), latency SLO assertions, response body substring checks, and optional baseline parity comparisons. When targeting a `PreviewGroup` with multiple exposed service URLs in `status.services` (and `--base-url` / `spec.routing.externalUrl` is not overriding it), only the first probe target (`path-or-url` or the first `--path` entry) controls service selection: if the first entry is a relative path, `diverge verify` selects every service in `status.services`, probes relative paths against every service (`http-status:<service>:<path>`, `latency-slo:<service>:<path>`, `body-contains:<service>:<path>`, `baseline-parity:<service>:<path>`), and probes any later absolute `http://` / `https://` `--path` entry once; if the first entry is an absolute `http://` or `https://` URL, `diverge verify` probes that URL once and resolves only the first service URL as the base for any subsequent relative `--path` entries (so not all services in `status.services` are checked).
- `--path` — HTTP path(s) or URL(s) to probe (repeatable, default: `["/"]`; ignored if a positional `path-or-url` argument is provided; with mixed relative/absolute entries, put a relative path first if you want relative paths checked across all `PreviewGroup` services)
- `--expect-status` — Expected HTTP status code (default: `0`, accepting any final `2xx`/`3xx` status `< 400` after following redirects; set e.g. `200` to require an exact status code)
- `--max-latency` — Maximum acceptable preview response latency (e.g., `500ms`)
- `--body-contains` — Substring that must appear in the preview HTTP response body
- `--compare-baseline` — Probe baseline (without preview routing headers) and verify HTTP status code parity
- `--fail-on-status-diff` — Fail verification if baseline and preview HTTP status codes differ when `--compare-baseline` is enabled (default: `true`)
- `--skip-doctor` — Skip Kubernetes workload health diagnostics (`doctor`)
- `--github-summary` — Write a Markdown verification scorecard table (plus Doctor diagnostics on failure) to `$GITHUB_STEP_SUMMARY` (or stdout if unset); when `GITHUB_ACTIONS=true`, failed checks also emit `::error::` workflow annotations
- `--json` — Output machine-readable JSON verification report
- `--base-url` — Override the base URL for HTTP verification
- `--auto-fix` — Automatically create or update a self-healing `AgentTask` (`autofix-verify-<env>`) when verification fails
- `-X, --method`, `-d, --data`, `-H, --header`, `--timeout` — Request method, body, custom headers, and per-request timeout (default: `15s`)

```bash
# Verify cluster workload health, /healthz endpoint, baseline status parity, and a 500ms latency SLO
diverge verify pr-42 --path /healthz --compare-baseline --max-latency 500ms

# Verify against an explicit gateway URL in CI and emit a JSON report
diverge verify pr-42 /api/status --base-url https://preview.example.com --body-contains '"ok":true' --json
```

### `diverge version`
Print version.


