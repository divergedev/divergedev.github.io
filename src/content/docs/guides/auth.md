---
title: Authentication
description: Guide to configuring authentication for the Diverge ConnectRPC server
---

The Diverge ConnectRPC server uses a composable triple-authentication system, supporting OIDC (OpenID Connect), Kubernetes TokenReview, and attenuated Macaroon capability tokens. This allows flexible authentication for human users, automated CI/CD pipelines, and autonomous coding agent sandboxes.

## Overview: Composable Auth Chain

- **OIDC (OpenID Connect)**: Primarily used for human developers accessing the Web Dashboard or CLI. It delegates authentication to an external identity provider (IdP).
- **Kubernetes TokenReview**: Primarily used for CI/CD pipelines or in-cluster services that authenticate using Kubernetes ServiceAccount tokens.
- **Macaroon Capability Tokens**: Used by autonomous `AgentTask` sandbox pods calling back into `diverge-server` (including `/mcp` and `POST /api/v1/agenttask/meter`). Tokens carry cryptographic HMAC-SHA256 caveats (`task_id`, `namespace`, `repo`, `branch`, `tools`, `models`, `max_cost_usd`, `max_tokens`, `expires`) and are validated against the namespace-scoped `diverge-agenttask-tokens` index `Secret` and live `AgentTask` status.

## Setting up Zitadel as OIDC Provider

Setting up an OIDC provider like Zitadel follows a similar pattern to configuring SSO for tools like Argo CD.

1. **Create an Application**: In Zitadel, create a new Web/Native application.
2. **Configure Redirect URIs**: Configure the appropriate redirect URIs for the CLI login flow.
3. **Configure Helm Values**: Update your Diverge Helm values with the Zitadel issuer URL and client ID.

```yaml
# values.yaml
server:
  auth:
    oidc:
      issuerUrl: "https://your-domain.zitadel.cloud"
      clientId: "<your-client-id>"
      groupsClaim: "urn:zitadel:iam:org:project:roles"
```

:::note
Zitadel returns roles as a map rather than a flat list. Diverge v0.8.1+ handles this natively, extracting role keys directly from the claims structure.
:::

## CLI & MCP Authentication

- **`diverge dev`**: Authenticates with `diverge-server` using `--token`, `DIVERGE_TOKEN`, or automatic `kubeconfig` bearer credential fallback.
- **`diverge mcp`**: Authenticates with `diverge-server` using `DIVERGE_TOKEN`, `DIVERGE_MACAROON_TOKEN`, or a mounted sandbox token file (`/etc/diverge/token/token`). It does not read credentials from `kubeconfig`.

```bash
# Mint a bound Kubernetes ServiceAccount token for diverge-server
export DIVERGE_TOKEN="$(kubectl create token my-sa --audience diverge-server)"

# Connect local dev tunnel or stdio MCP server
diverge dev --service payments-api --server https://diverge.example.com
diverge mcp --server-url https://diverge.example.com
```

## CI/CD Authentication

For automated pipelines (e.g., GitHub Actions, GitLab CI), commands that reconcile Kubernetes Custom Resources directly such as `diverge preview create` require `KUBECONFIG`:

```yaml
# Example CI/CD step
- name: Deploy Preview
  run: |
    diverge preview create --name pr-${{ github.event.pull_request.number }} --service payments-api=ghcr.io/acme/payments:pr-${{ github.event.pull_request.number }}
```

## CLI Tunnel Authentication (`diverge dev`)

Starting in `v0.10.0`, reverse tunnels created via `diverge dev` authenticate directly against the ConnectRPC server using Kubernetes TokenReview:
- Pass credentials with `--token <token>` or the `DIVERGE_TOKEN` environment variable.
- If omitted, `diverge dev` automatically falls back to bearer credentials configured in the current `kubeconfig` context.

## Secure Cookies Behind TLS Proxies

When the Diverge ConnectRPC server is deployed behind an Ingress controller, API Gateway, or reverse proxy that terminates TLS, session cookies must be protected with the `Secure` flag.

Diverge provides the `--secure-cookies` server flag (`server.auth.secureCookies` in Helm values):

```yaml
# values.yaml
server:
  auth:
    secureCookies: "auto" # "auto" (default) | "true" | "false"
```

- **`auto`**: Inspects the `X-Forwarded-Proto` header. If `https`, sets `Secure; SameSite=Lax`. If plain `http` (such as local port-forwarding), omits `Secure` so developers aren't locked out.
- **`true`**: Unconditionally forces the `Secure` attribute on all session cookies.
- **`false`**: Disables the `Secure` attribute.

## Token Lifecycle and Expiry

- **OIDC Tokens**: Rely on the expiration policies set by your IdP. The Diverge CLI will prompt for re-authentication when the token expires.
- **ServiceAccount Tokens**: It is recommended to use bound ServiceAccount tokens with a set expiration in Kubernetes 1.24+, rather than static, non-expiring secrets, to ensure a secure token lifecycle.
- **Macaroon Capability Tokens (`AgentTask`)**:
  - Minted automatically by `diverge-controller` when an `AgentTask` is provisioned and stored in `<task>-token` (mounted read-only at `/etc/diverge/token/token` inside the sandbox pod) as well as indexed in the namespace-scoped `diverge-agenttask-tokens` `Secret`.
  - When a sandbox reports `tokensUsed` / `costUSD` usage to `POST /api/v1/agenttask/meter` that exceeds `max_cost_usd`, `max_tokens`, `budgetUSD`, or `budgetTokens` (or when a user runs `/diverge pause`), the token is immediately marked `"revoked"` in `diverge-agenttask-tokens` and the task transitions to `Paused`.
  - Resuming the task (`/diverge resume` or setting `spec.suspended: false`) mints a fresh Macaroon capability token with the updated budget caveats.

