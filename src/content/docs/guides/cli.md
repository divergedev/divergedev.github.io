---
title: CLI Reference
description: Diverge CLI commands
---

The Diverge CLI provides tools to interact with your preview environments directly from your terminal.

## Commands

### `diverge create`
Create an environment from the current branch.

### `diverge delete <name>`
Delete an environment.

### `diverge dev [flags]`
Route cluster traffic to your local machine.
- `--service` — Service name (default: auto-detect)
- `--port` — Local port (default: 8080)
- `--endpoint` — Local endpoint IP (default: tailscale ip -4)
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
Initialize a local dev playground.

### `diverge list`
List all environments.

### `diverge logs [env-name]`
Stream logs.

### `diverge mcp`
Run MCP server over stdio for AI agent integration.

### `diverge open <name>`
Open env URL in browser.

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

### `diverge validate`
Validate .diverge.yaml.

### `diverge version`
Print version.
