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
- **PDB (PodDisruptionBudget)**: Ensures high availability during node drains or evictions.

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set server.enabled=true
```

## Security and Access Control

### Authentication

The server supports a robust dual-authentication model:
1. **OIDC (OpenID Connect)**: Validates standard JWTs against your identity provider.
2. **Kubernetes TokenReview**: Validates Kubernetes ServiceAccount tokens.

### Authorization

Authorization is handled via **namespace-scoped SubjectAccessReview**. The server delegates permission checks to the Kubernetes RBAC system, ensuring users only have access to namespaces where they have appropriate permissions.

### Hardened Security Posture

- **Error Sanitization**: Internal server errors and stack traces are sanitized before returning to the client to prevent information disclosure.
- **Audit Logging**: All mutating API actions are recorded in a structured JSON audit log.
- **Security Context**: The server pod runs with a hardened `securityContext`, dropping unnecessary privileges and running as a non-root user.

## API Features

The ConnectRPC API supports several advanced features for robustness and performance:
- **Pagination**: List endpoints support cursor-based pagination.
- **Optimistic Concurrency**: Mutating endpoints support resource version checking to prevent lost updates.
- **CORS**: Configurable Cross-Origin Resource Sharing for browser-based clients.

## Example Usage

You can interact with the server directly using `curl` and standard HTTP/JSON, thanks to ConnectRPC's seamless JSON support:

```bash
curl -X POST http://diverge-server:8080/diverge.v1alpha1.EnvironmentService/ListEnvironments \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <token>' \
  -d '{"namespace": "default", "page_size": 10}'
```
