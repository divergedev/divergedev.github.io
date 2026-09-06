---
title: Authentication
description: Guide to configuring authentication for the Diverge ConnectRPC server
---

The Diverge ConnectRPC server uses a dual authentication system, supporting both OIDC (OpenID Connect) and Kubernetes TokenReview. This allows flexible authentication for both human users and automated CI/CD pipelines.

## Overview: Dual Auth System

- **OIDC (OpenID Connect)**: Primarily used for human developers accessing the server via the CLI. It delegates authentication to an external identity provider (IdP).
- **Kubernetes TokenReview**: Primarily used for CI/CD pipelines or in-cluster services that authenticate using Kubernetes ServiceAccount tokens.

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

## CLI Authentication

Developers can authenticate with the Diverge server using the `diverge login` command.

```bash
# Authenticate using a token (OIDC or ServiceAccount)
diverge login --server https://diverge.example.com --token <your-token>
```

Once logged in, the CLI stores the credentials in a local context file, allowing subsequent commands to seamlessly communicate with the server.

## CI/CD Authentication

For automated pipelines (e.g., GitHub Actions, GitLab CI), it is recommended to use the `DIVERGE_TOKEN` environment variable. This avoids the need to run `diverge login` interactively.

```yaml
# Example CI/CD step
- name: Deploy Preview
  env:
    DIVERGE_TOKEN: ${{ secrets.DIVERGE_CI_TOKEN }}
  run: |
    diverge preview create --server https://diverge.example.com -f .diverge.yaml
```

The token provided can be a long-lived Kubernetes ServiceAccount token with the necessary RBAC permissions to create and manage Diverge CRDs.

## CLI Tunnel Authentication (`diverge dev`)

Starting in `v0.10.0`, reverse tunnels created via `diverge dev` authenticate directly against the ConnectRPC server using Kubernetes TokenReview:
- Pass credentials with `--token <token>` or the `DIVERGE_TOKEN` environment variable.
- If omitted, `diverge dev` automatically falls back to bearer credentials configured in the current `kubeconfig` context.

## Secure Cookies Behind TLS Proxies

When the Diverge ConnectRPC server is deployed behind an Ingress controller, API Gateway, or reverse proxy that terminates TLS, session cookies must be protected with the `Secure` flag.

Diverge provides the `--secure-cookies` server flag (`server.secureCookies` in Helm values):

```yaml
# values.yaml
server:
  secureCookies: "auto" # "auto" (default) | "true" | "false"
```

- **`auto`**: Inspects the `X-Forwarded-Proto` header. If `https`, sets `Secure; SameSite=Lax`. If plain `http` (such as local port-forwarding), omits `Secure` so developers aren't locked out.
- **`true`**: Unconditionally forces the `Secure` attribute on all session cookies.
- **`false`**: Disables the `Secure` attribute.

## Token Lifecycle and Expiry

- **OIDC Tokens**: Rely on the expiration policies set by your IdP. The Diverge CLI will prompt for re-authentication when the token expires.
- **ServiceAccount Tokens**: It is recommended to use bound ServiceAccount tokens with a set expiration in Kubernetes 1.24+, rather than static, non-expiring secrets, to ensure a secure token lifecycle.

