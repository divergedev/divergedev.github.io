---
title: ConnectRPC Server
description: Guide to setting up and connecting to the Diverge ConnectRPC server
---

The Diverge ConnectRPC server provides a robust API layer over the Diverge Kubernetes CRDs. It enables developers and CI/CD pipelines to manage preview environments without requiring `kubectl` access or direct Kubernetes cluster credentials.

## What the Server Provides

- **API Access Without kubectl**: Interact with Diverge using a standard REST/gRPC API.
- **ConnectRPC Protocol**: Fully typed, high-performance API supporting both unary calls and streaming.
- **Fine-Grained Authentication**: Dual authentication supporting both OIDC and Kubernetes TokenReview.
- **CLI Integration**: Native support in the Diverge CLI via the `--server` flag and context management.

## Installation

The server can be deployed alongside the Diverge controller using the official Helm chart by setting `server.enabled: true`.

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set server.enabled=true
```

## Configuration

Server configuration is managed through the Helm values, allowing you to configure authentication providers and TLS.

```yaml
# values.yaml
server:
  enabled: true
  auth:
    # Example OIDC configuration
    oidc:
      issuerUrl: "https://auth.example.com"
      clientId: "diverge-server"
      groupsClaim: "groups"
  tls:
    enabled: true
    secretName: "diverge-server-tls"
```

## Health Endpoints

The server exposes standard health and readiness endpoints for Kubernetes probes and monitoring:

- `/healthz`: Liveness probe endpoint.
- `/readyz`: Readiness probe endpoint.

## Connecting the CLI

Once the server is running and accessible, you can connect the Diverge CLI using the `diverge login` command:

```bash
# Login using an OIDC or ServiceAccount token
diverge login --server https://diverge.example.com --token eyJhbGci...

# List environments via the server
diverge list
```

For more details on CLI authentication and context management, see the [CLI Reference](/guides/cli).
