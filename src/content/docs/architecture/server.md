---
title: Server Architecture
description: Architecture overview of the Diverge ConnectRPC Server
---

The Diverge ConnectRPC Server provides a robust API foundation for interacting with Diverge, abstracting away direct Kubernetes API access while maintaining a secure and stateless design.

## Stateless Facade Pattern

The Diverge Server is designed as a **stateless facade**. It does not have its own database or local storage. Instead, the Kubernetes Custom Resource Definitions (CRDs)—such as `Environment` and `PreviewGroup`—serve as the absolute single source of truth. The server simply translates ConnectRPC requests into Kubernetes API calls on behalf of the authenticated user.

## ConnectRPC Services

The API is structured around several core ConnectRPC services:

- **Environment Service**: Manages the lifecycle of individual `Environment` resources (create, list, get, delete).
- **PreviewGroup Service**: Manages `PreviewGroup` resources, which orchestrate multiple environments for a single MR/PR.
- **Cluster Service**: Provides cluster-level metadata and health information.
- **Auth Service**: Handles authentication verification and identity endpoints.

## Streaming Capabilities

The server leverages ConnectRPC's streaming capabilities to provide real-time updates without polling:

- **Watch Events**: Clients can subscribe to a stream of CRD changes (e.g., watching an Environment's status transition from `Pending` to `Ready`).
- **Log Streaming**: The server can stream application logs from preview environment pods directly to the CLI or UI.

## Auth Chain

Security is enforced through a robust authentication and authorization chain:

1. **OIDC / K8s TokenReview**: The incoming request provides a token. The server verifies this token either via the configured OIDC provider or by delegating to the Kubernetes `TokenReview` API.
2. **Identity Extraction**: User information and group memberships are extracted from the validated token.
3. **RBAC (SubjectAccessReview)**: Before performing any action, the server uses the Kubernetes `SubjectAccessReview` API to verify that the authenticated user (or service account) has the necessary RBAC permissions to perform the requested action on the target CRD in the specified namespace.

## Deployment Topology

When the server is enabled, the typical Diverge deployment topology expands:

- **Controller**: The core operator managing CRDs, Argo CD Applications, and cleanups.
- **Proxy**: The layer-7 router handling header-based routing for HTTP traffic.
- **Server**: The user-facing ConnectRPC API facade for the CLI and external integrations.

This separation of concerns ensures that the data plane (Proxy), control plane (Controller), and management API (Server) scale independently.
