---
title: MCP Server & IDE Integration
description: Connect Claude Code, Claude Desktop, Cursor, and VS Code to Diverge via the built-in stdio and HTTP Model Context Protocol (MCP) servers.
---

Diverge includes a built-in Model Context Protocol (MCP) server available both as a local `stdio` server in the CLI (`diverge mcp`) and as a remote HTTP JSON-RPC endpoint on `diverge-server` (`POST /mcp`).

Using the MCP server, AI assistants and autonomous `AgentTask` pods can query active environments, provision ephemeral previews, extend TTLs, manage `AgentTask` sandboxes, monitor deployment readiness, and diagnose failure logs directly within your development workflow.

---

## 1. Overview

Diverge supports two MCP transport modes:

1. **CLI `stdio` Server (`diverge mcp`)**: Runs locally over standard input/output (`stdio`) and forwards ConnectRPC calls to `diverge-server`. Ideal for local IDE integrations (Claude Code, Claude Desktop, Cursor, VS Code).
2. **Remote HTTP Server (`POST /mcp` on `diverge-server`)**: Built directly into `diverge-server` and authenticated via OIDC, Kubernetes `TokenReview`, or `AgentTask` Macaroon capability tokens. Ideal for in-cluster agents and remote MCP clients.

```text
+-------------------------------------------------------------+
|               AI Assistant / Agent / IDE                    |
|          (Claude Code, Claude Desktop, Cursor, VS Code)     |
+-------------------------------------------------------------+
               |                               |
  MCP (stdio)  |                               | MCP (HTTP POST /mcp)
               v                               |
+------------------------------+               |
|         diverge mcp          |               |
|  (stdio MCP / proto2mcp)     |               |
+------------------------------+               |
               |                               |
               +---------------+---------------+
                               | ConnectRPC / JSON-RPC
                               v
+-------------------------------------------------------------+
|                    diverge-server                           |
|             (Kubernetes API Facade / CRDs)                  |
+-------------------------------------------------------------+
```

### Tool Naming Convention

All MCP tools are named using the `diverge_<snake_case_method>` pattern derived from Diverge's protobuf service definitions:
- RPC `EnvironmentService.CreateEnvironment` → Tool `diverge_create_environment`
- RPC `EnvironmentService.GetEnvironment` → Tool `diverge_get_environment`
- RPC `PreviewGroupService.ListPreviewGroups` → Tool `diverge_list_preview_groups`

### Security Scoping

The MCP server enforces strict security boundaries:
- **Exposed Services**: Only `EnvironmentService`, `PreviewGroupService`, and `AgentTask` helper operations are exposed.
- **Excluded Services**: Sensitive internal services such as `AuthService`, `ClusterService`, and `TunnelService` are **never** exposed to AI agents over MCP.
- **CLI Safe Mode (`--allow-destructive`)**: The CLI `diverge mcp` `stdio` server omits destructive tools (`diverge_delete_environment`, `diverge_delete_preview_group`, and `diverge_cancel_task`) by default unless `--allow-destructive` is explicitly passed.
- **Remote Endpoint Authorization (`POST /mcp`)**: The remote `POST /mcp` endpoint exposes the registered toolset (including `diverge_delete_environment`, `diverge_delete_preview_group`, and `diverge_cancel_task`) and controls access via Kubernetes RBAC / `SubjectAccessReview` for human and `ServiceAccount` callers, or via the Macaroon token's `namespace` and `tools` caveats for `AgentTask` callers.

### Streaming RPC Handling

Standard MCP tool calls operate using request/response semantics. Streaming RPCs defined on the API server (`WatchEnvironments`, `StreamLogs`, `WatchPreviewGroups`) are automatically skipped during standard tool generation.

To provide streaming-like functionality without unbounded context consumption, Diverge registers dedicated non-streaming helper tools:
- `diverge_wait_for_ready`: Blocks until an environment reaches `Ready` or `Failed`/`Error` phase (up to 5 minutes), eliminating noisy polling loops.
- `diverge_fetch_errors`: Fetches recent `ERROR` and `FATAL` log lines from environment pods, protecting agent context windows from log spam.

---

## 2. Prerequisites

Before connecting your AI editor to the Diverge MCP server, ensure you have:

1. **Diverge CLI** installed (`diverge version`):
   ```bash
   curl -fsSL https://divergedev.com/install.sh | sh
   ```
2. **Access to a Diverge API Server** (`diverge-server`):
   - **In-cluster / Remote**: An accessible ConnectRPC endpoint (e.g., `https://diverge.example.com` or via ingress).
   - **Local Port-Forward**:
     ```bash
     kubectl port-forward -n diverge-system svc/diverge-server 8080:8443
     ```

---

## 3. Quick Start

Run the MCP server directly from your terminal to verify connectivity:

```bash
diverge mcp --server-url http://localhost:8080
```

You can also specify the server URL using the `DIVERGE_SERVER_URL` environment variable:

```bash
export DIVERGE_SERVER_URL="http://localhost:8080"
diverge mcp
```

The process will listen on `stdio` for JSON-RPC messages from MCP clients.

---

## 4. Tool Categories

The MCP server provides the following tools grouped by service:

### EnvironmentService Tools

| Tool Name | Description |
| :--- | :--- |
| `diverge_create_environment` | Provision a new preview environment with source branch, routing rules, and database configuration. |
| `diverge_get_environment` | Fetch details, conditions, URLs, and phase status of a specific preview environment. |
| `diverge_list_environments` | List environments with optional filters (namespace, branch, phase, label selector) and pagination. |
| `diverge_update_environment` | Update an existing environment spec or update mask. |
| `diverge_delete_environment` | Delete an environment and clean up its resources (*requires `--allow-destructive`*). |
| `diverge_extend_ttl` | Extend the remaining Time-To-Live (TTL) for an active preview environment. |
| `diverge_list_hook_jobs` | List database migration and post-deploy lifecycle hook Jobs for an environment. |
| `diverge_retry_hook` | Re-trigger a failed lifecycle hook Job (e.g., migration or post-deploy task). |

### PreviewGroupService Tools

| Tool Name | Description |
| :--- | :--- |
| `diverge_create_preview_group` | Create a multi-service PreviewGroup CR managing several microservices for an MR/PR. |
| `diverge_get_preview_group` | Retrieve status, member services, endpoints, and conditions for a PreviewGroup. |
| `diverge_list_preview_groups` | List PreviewGroups across namespaces with label selectors and pagination. |
| `diverge_update_preview_group` | Update configuration or service definitions for a PreviewGroup. |
| `diverge_delete_preview_group` | Tear down a PreviewGroup and its child environments (*requires `--allow-destructive`*). |

### Built-in Helper & Diagnostic Tools

| Tool Name | Description |
| :--- | :--- |
| `diverge_wait_for_ready` | Block execution until a target environment reaches `Ready` or `Failed` phase (max 5 minutes). |
| `diverge_fetch_errors` | Retrieve the last error-level (`ERROR`, `FATAL`, `panic`) log lines from an environment to diagnose failures. |
| `diverge_doctor` | Run cluster and environment health checks (GatewayClass, CRDs, RBAC, database connectivity). |
| `diverge_loadtest` | Run a bounded HTTP/gRPC load test against a preview environment and return latency/error percentiles. |

### Autonomous AgentTask Tools

| Tool Name | Description |
| :--- | :--- |
| `diverge_create_task` | Spawn a new sandboxed `AgentTask` with repository, branch, model capabilities, and USD/token/iteration budgets. |
| `diverge_get_task` | Retrieve the current phase (`Pending`, `Provisioning`, `Active`, `Paused`, `Completed`, `Failed`), iteration count, token usage, and sandbox pod status. |
| `diverge_list_tasks` | List `AgentTask` resources in a namespace with optional phase filtering. |
| `diverge_pause_task` | Suspend an active `AgentTask` (`spec.suspended: true`) so the controller transitions it to `Paused` and revokes its Macaroon capability token upon reconciliation. |
| `diverge_resume_task` | Resume a paused `AgentTask` and mint a fresh Macaroon capability token. |
| `diverge_guide_task` | Send steering instructions or updated budget/iteration limits to an `AgentTask` and resume execution. |
| `diverge_cancel_task` | Cancel and tear down an `AgentTask` sandbox (*requires `--allow-destructive`*). |

---

## 5. Editor Setup

Configure your AI assistant or editor to launch `diverge mcp` as a stdio tool server.

### Claude Code / Claude Desktop

Add the server configuration to `~/.claude/claude_desktop_config.json` (or `~/.claude.json`):

```json
{
  "mcpServers": {
    "diverge": {
      "command": "diverge",
      "args": ["mcp", "--server-url", "http://localhost:8080"]
    }
  }
}
```

### Cursor

Create or edit `.cursor/mcp.json` in your workspace root or global Cursor settings:

```json
{
  "mcpServers": {
    "diverge": {
      "command": "diverge",
      "args": ["mcp", "--server-url", "http://localhost:8080"]
    }
  }
}
```

### VS Code

Add the server entry to `.vscode/mcp.json` in your project workspace:

```json
{
  "servers": {
    "diverge": {
      "type": "stdio",
      "command": "diverge",
      "args": ["mcp", "--server-url", "http://localhost:8080"]
    }
  }
}
```

:::tip
If your Diverge server is running behind a custom domain, set `DIVERGE_SERVER_URL` as an environment variable in your MCP configuration:
```json
{
  "mcpServers": {
    "diverge": {
      "command": "diverge",
      "args": ["mcp"],
      "env": {
        "DIVERGE_SERVER_URL": "https://diverge.internal.example.com"
      }
    }
  }
}
```
:::

---

## 6. Destructive Operations

By default, the CLI `diverge mcp` `stdio` server operates in **safe mode**:
- Destructive tools (`diverge_delete_environment`, `diverge_delete_preview_group`, and `diverge_cancel_task`) are **omitted** from the CLI's registered tool registry.
- AI assistants connected over `stdio` cannot accidentally delete active preview environments, tear down running `PreviewGroup`s, or cancel running `AgentTask`s unless `--allow-destructive` is set.
- On the remote `POST /mcp` endpoint (`diverge-server`), `diverge_delete_environment`, `diverge_delete_preview_group`, and `diverge_cancel_task` are exposed and governed by the caller's authorization: Kubernetes RBAC / `SubjectAccessReview` for human and `ServiceAccount` callers, or the Macaroon capability token's `namespace` and `tools` caveats for `AgentTask` callers.

### Enabling Destructive Tools on the CLI

To allow your AI assistant to use `diverge_delete_environment`, `diverge_delete_preview_group`, and `diverge_cancel_task` over `diverge mcp`, append the `--allow-destructive` flag:

```json
{
  "mcpServers": {
    "diverge": {
      "command": "diverge",
      "args": [
        "mcp",
        "--server-url", "http://localhost:8080",
        "--allow-destructive"
      ]
    }
  }
}
```

:::caution
Enabling `--allow-destructive` allows the AI agent to initiate irreversible deletions and cleanup of Kubernetes preview namespaces, databases, and `AgentTask` sandboxes.
:::

---

## 7. Flags Reference

### `diverge mcp` Command Flags

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--server-url` | `string` | `""` | Diverge API server URL. If empty, falls back to `DIVERGE_SERVER_URL` environment variable. |
| `--allow-destructive` | `bool` | `false` | Enable destructive tools (`delete` / `cancel` methods). |

### Global Flags

| Flag | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--kubeconfig` | `string` | `~/.kube/config` | Path to the Kubernetes kubeconfig file. |
| `-n`, `--namespace` | `string` | `""` | Kubernetes namespace (defaults to active kubeconfig context). |
| `--context` | `string` | `""` | Kubernetes context name. |
| `--no-color` | `bool` | `false` | Disable ANSI color formatting. |
