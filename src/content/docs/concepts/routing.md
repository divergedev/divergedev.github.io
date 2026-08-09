---
title: Routing Modes
description: Traffic routing in Diverge
---

Diverge relies on advanced routing techniques to ensure preview environments behave as expected without requiring complete isolation.

## Header-Based Routing

The primary routing mode in Diverge. When a preview environment is created, a unique header is generated (e.g., `x-diverge-env: pr-123`).

- Any incoming request with this header is intercepted by your Gateway (Istio/Gateway API).
- The Gateway routes the traffic to your delta deployments.
- If a service in the delta deployment calls another service that wasn't modified, the header propagates, but the traffic falls back to the baseline service.

This enables seamless integration testing while maximizing resource efficiency.

## Diverge Proxy

Diverge includes a purpose-built proxy to enhance routing and visibility:
- **Health Endpoints:** Uses `/-/healthz` and `/-/readyz` (avoiding `/healthz` to prevent upstream path shadowing). The readiness probe checks Kubernetes informer cache sync.
- **Graceful Shutdown:** Handles `SIGTERM` with a 10-second drain.
- **Structured Logging:** Uses logr/zap for consistent and structured logs.
- **CORS:** The CORS origin allowlist strictly validates against the preview domain.
