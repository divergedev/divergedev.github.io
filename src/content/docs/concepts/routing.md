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

## Istio Ambient & Waypoint Proxies

Diverge is fully compatible with Istio Ambient mode (zero sidecars):

- **L4 via ztunnel**: Secure L4 networking is handled transparently by the node-level ztunnel.
- **L7 via Waypoint**: Layer 7 routing (`HTTPRoute`) for header-based routing is processed by the Waypoint proxy.
- **Gateway API**: Diverge natively generates Kubernetes Gateway API `HTTPRoute` resources to perform the header-based routing, which Istio Ambient consumes.
- **Knative Kourier**: Fully compatible with Knative's Kourier ingress for namespaces running serverless scale-to-zero workloads.

### Prerequisites

To use L7 header-based routing with Istio Ambient:
- **Waypoint Proxy**: Deploy an Istio Waypoint proxy in the target namespace (e.g. `istioctl waypoint apply --namespace <namespace>`).
- **Waypoint Enrollment**: Ensure the namespace or target workloads are labeled with `istio.io/use-waypoint: <waypoint-name>` so L7 traffic is redirected to the Waypoint proxy for policy and routing enforcement.
- **Ingress Gateway**: For external traffic entering the cluster, configure an Ingress Gateway (such as Istio Ingress Gateway or a Gateway API Gateway) with appropriate listeners and routing to forward requests to the Waypoint proxy or services.

## Diverge Proxy

Diverge includes a purpose-built proxy to enhance routing and visibility:
- **Health Endpoints:** Uses `/-/healthz` and `/-/readyz` (avoiding `/healthz` to prevent upstream path shadowing). The readiness probe checks Kubernetes informer cache sync.
- **Graceful Shutdown:** Handles `SIGTERM` with a 10-second drain.
- **Structured Logging:** Uses logr/zap for consistent and structured logs.
- **CORS:** The CORS origin allowlist strictly validates against the preview domain.
