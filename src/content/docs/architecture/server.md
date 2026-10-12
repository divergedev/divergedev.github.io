---
title: Server Architecture
description: Architecture overview of the Diverge ConnectRPC Server
---

The Diverge ConnectRPC Server provides a robust API foundation for interacting with Diverge, abstracting away direct Kubernetes API access while maintaining a secure and stateless design.

## Stateless Facade Pattern

The Diverge Server is designed as a **stateless facade**. It does not have its own database or local storage. Instead, the Kubernetes Custom Resource Definitions (CRDs)—such as `Environment` and `PreviewGroup`—serve as the absolute single source of truth. The server simply translates ConnectRPC requests into Kubernetes API calls on behalf of the authenticated user.

## ConnectRPC Services & HTTP Endpoints

The API is structured around several core services and endpoints:

- **Environment Service**: Manages the lifecycle of individual `Environment` resources (create, list, get, delete, extend TTL, list/retry hooks).
- **PreviewGroup Service**: Manages `PreviewGroup` resources, which orchestrate multiple environments for a single MR/PR.
- **Cluster Service**: Provides cluster-level metadata and health information.
- **Auth Service**: Handles authentication verification, OIDC browser login (`/auth/login`, `/auth/callback`), and identity endpoints.
- **Remote MCP Endpoint (`/mcp`)**: Serves Model Context Protocol (MCP) JSON-RPC tools over HTTP for IDE and agent integrations.
- **AgentTask Metering Endpoint (`POST /api/v1/agenttask/meter`)**: Receives live LLM `tokensUsed` and `costUSD` reports from autonomous `AgentTask` sandboxes, enforces Macaroon `allowed_models`, `max_cost_usd`, and `max_tokens` caveats as well as `budgetUSD` and `budgetTokens`, and auto-pauses tasks (`429 Too Many Requests`) when budgets are exceeded.

## Streaming Capabilities

The server leverages ConnectRPC's streaming capabilities to provide real-time updates without polling:

- **Watch Events**: Clients can subscribe to a stream of CRD changes (e.g., watching an Environment's status transition from `Pending` to `Ready`).
- **Log Streaming**: The server can stream application logs from preview environment pods directly to the CLI or UI.

## Auth Chain

Security is enforced through a composable authentication and authorization chain:

1. **OIDC / K8s TokenReview / Macaroon Capability Auth**:
   - **OIDC & TokenReview**: Verifies human JWTs against the configured OIDC provider or ServiceAccount tokens via the Kubernetes `TokenReview` API.
   - **Macaroon Capability Tokens**: Verifies HMAC-SHA256 chained Macaroons presented by `AgentTask` sandbox pods against `DIVERGE_MACAROON_ROOT_KEY`, the namespace-scoped `diverge-agenttask-tokens` index `Secret`, and live `AgentTask` state (`Active` and not suspended).
2. **Identity & Caveat Extraction**: User/group identity or Macaroon caveats (`task_id`, `namespace`, `repo`, `branch`, `tools`, `models`, `max_cost_usd`, `max_tokens`, `expires`) are extracted from the validated token.
3. **RBAC (`SubjectAccessReview`) & Caveat Enforcement**: Before performing any action, the server uses the Kubernetes `SubjectAccessReview` API (or Macaroon namespace/tool/budget caveat verification) to ensure the caller is authorized on the target resource in the specified namespace.

## Deployment Topology

When the server is enabled, the typical Diverge deployment topology expands:

- **Controller**: The core operator managing `Environment`, `PreviewGroup`, and `AgentTask` CRDs, minting Macaroons, and orchestrating cleanups.
- **Proxy & Activator**: The layer-7 routers handling header/subdomain routing and cold-start wake-up (`--wake-splash`).
- **Server**: The user-facing ConnectRPC API facade, embedded React Web Dashboard, `/mcp` server, and `AgentTask` metering endpoint.

This separation of concerns ensures that the data plane (Proxy), control plane (Controller), and management API (Server) scale independently.
