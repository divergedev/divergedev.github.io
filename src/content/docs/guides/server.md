---
title: ConnectRPC Server API
description: Guide to setting up and connecting to the Diverge ConnectRPC server
---

The Diverge ConnectRPC server provides a robust API layer over the Diverge Kubernetes CRDs. It is an **opt-in**, **stateless CRD facade** that runs as a **separate binary** within the Diverge system, enabling developer access without requiring `kubectl` access or direct Kubernetes cluster credentials.

## Installation and Helm Setup

The server can be deployed alongside the Diverge controller using the official Helm chart by setting `server.enabled: true`.

When enabled, the Helm chart automatically provisions:
- **RBAC**: A dedicated ServiceAccount, ClusterRole, and RoleBinding.
- **Service**: A Kubernetes Service for internal traffic routing.
- **PDB (PodDisruptionBudget)**: Limits voluntary disruptions during node drains and cluster maintenance.

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set server.enabled=true
```

## Security and Access Control

### Authentication

The server supports a composable triple-authentication model:
1. **OIDC (OpenID Connect)**: Validates standard JWTs and browser SSO sessions against your identity provider.
2. **Kubernetes TokenReview**: Validates Kubernetes ServiceAccount tokens.
3. **Macaroon Capability Tokens (`DIVERGE_MACAROON_ROOT_KEY`)**: Authenticates autonomous `AgentTask` sandbox pods using attenuated HMAC-SHA256 Macaroons verified against the namespace-scoped `diverge-agenttask-tokens` index `Secret` and live `AgentTask` phase (`Active`).

### Authorization

Authorization is handled via **namespace-scoped SubjectAccessReview** (or caveat enforcement for Macaroon capability tokens). The server delegates permission checks to the Kubernetes RBAC system, ensuring users and sandboxes only have access to namespaces and tools where they have appropriate permissions.

### Hardened Security Posture

- **Error Sanitization**: Internal server errors and stack traces are sanitized before returning to the client to prevent information disclosure.
- **Audit Logging**: All mutating API actions are recorded in a structured JSON audit log.
- **Security Context**: The server pod runs with a hardened `securityContext`, dropping unnecessary privileges and running as a non-root user.

## API Features

The ConnectRPC API supports several advanced features for robustness and performance:
- **Pagination**: List endpoints support cursor-based pagination.
- **Optimistic Concurrency**: Mutating endpoints support resource version checking to prevent lost updates.
- **CORS**: Configurable Cross-Origin Resource Sharing for browser-based clients.
- **Remote MCP Endpoint (`/mcp`)**: Exposes Diverge environment and `AgentTask` tools directly over HTTP JSON-RPC.
- **Live AgentTask Metering (`POST /api/v1/agenttask/meter`)**: Tracks LLM token consumption and USD cost in real time and automatically pauses tasks that exceed their budget.

## Live AgentTask Metering (`POST /api/v1/agenttask/meter`)

Autonomous coding agents running inside `AgentTask` sandboxes report LLM token and cost usage after each model call to `POST /api/v1/agenttask/meter` authenticated with their Bearer Macaroon token:

```bash
curl -X POST https://diverge.example.com/api/v1/agenttask/meter \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $(cat /etc/diverge/token/token)" \
  -d '{
    "model": "claude-3-7-sonnet",
    "tokensUsed": 1500,
    "costUSD": 0.0225
  }'
```

The endpoint returns `{"allowed": true, "suspended": false, "totalTokensUsed": 1500, "totalCostUSD": 0.0225}` on `200 OK` and enforces:
1. **Model Capability Check**: Rejects requests with `403 Forbidden` if `model` is omitted or not permitted by the Macaroon's `allowed_models` caveat (`spec.capabilities`).
2. **Atomic Status Updates**: Increments `status.tokensConsumed` and `status.costUSD` on the `AgentTask` using optimistic concurrency (`RetryOnConflict`).
3. **Budget & Caveat Enforcement**: If the updated cumulative usage exceeds the Macaroon's `max_cost_usd` or `max_tokens` caveats or the `AgentTask` spec (`budgetUSD`, `budgetTokens`), the server immediately sets `spec.suspended = true` and `status.phase = Paused` (`Reason: BudgetExceeded`), marks the token revoked in `diverge-agenttask-tokens`, and returns `429 Too Many Requests` (`{"allowed": false, "suspended": true, "reason": "budget exceeded", "totalTokensUsed": ..., "totalCostUSD": ...}`).

## Example Usage

You can interact with the server directly using `curl` and standard HTTP/JSON, thanks to ConnectRPC's seamless JSON support:

```bash
curl -X POST http://diverge-server:8080/diverge.v1alpha1.EnvironmentService/ListEnvironments \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"namespace": "default", "page_size": 10}'
```

> **Note:** This example uses `http://` for in-cluster development. In production, always use TLS (`https://`) when transmitting bearer tokens.
