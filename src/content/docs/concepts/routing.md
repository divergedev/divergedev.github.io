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

## Subdomain Routing

While header-based routing is optimal for backend microservices and automated API tests, frontend single-page applications (React, Next.js, Vue), mobile web views, and third-party webhooks cannot easily inject custom HTTP headers into browser navigation requests.

Subdomain routing provides clean, browser-accessible URLs for each preview environment by routing traffic based on the HTTP `Host` header.

### How It Works

1. When an environment `pr-123` is created, Diverge generates a Gateway API `HTTPRoute` matching hostnames like `pr-123.preview.example.com`.
2. Traffic sent to `https://pr-123.preview.example.com` is intercepted by your Gateway Ingress.
3. The Gateway routes requests directly to the preview service delta deployment.
4. Baseline services remain shared, and internal service calls propagate context seamlessly.

### Configuration

Enable subdomain routing by setting `mode: subdomain` and defining the target domain in your configuration:

```yaml
# Environment CRD or .diverge.yaml
apiVersion: diverge.io/v1alpha1
kind: Environment
metadata:
  name: pr-123
spec:
  routing:
    mode: subdomain
    baseDomain: preview.example.com
```

### DNS & TLS Requirements

To support dynamic subdomains without manual DNS or certificate management:

- **Wildcard DNS**: Configure a wildcard DNS record (e.g., `*.preview.example.com`) pointing to your Ingress Gateway's external IP or CNAME.
- **Wildcard TLS Certificate**: Provision a wildcard certificate for `*.preview.example.com` (for example, using `cert-manager` with Let's Encrypt DNS01 challenges) and attach it to your Gateway listener.

### Routing Mode Comparison

| Feature / Aspect | Header-Based Routing | Subdomain Routing | Namespace Routing |
| :--- | :--- | :--- | :--- |
| **Routing Mechanism** | L7 HTTP Header (`x-diverge-env`) | Host / SNI (`<env>.preview.domain`) | Dedicated K8s Namespace |
| **Frontend / Browser Support** | Requires browser extension or proxy injection | Native browser support (clickable URLs) | Native browser support |
| **DNS / TLS Setup** | Single static domain & cert | Wildcard DNS (`*.domain`) & wildcard TLS | Wildcard or per-namespace DNS/TLS |
| **Third-Party Webhooks** | Challenging (webhooks lack custom headers) | Native (dedicated callback URL per PR) | Native (dedicated callback URL per PR) |
| **Service Sharing (Deltas)** | Shared baseline with delta overrides | Shared baseline with delta overrides | Full duplication or cross-namespace mesh |
| **Resource Efficiency** | Highest (only changed pods deploy) | Highest (only changed pods deploy) | Lower (deploys full stack per env) |

## Diverge Proxy

Diverge includes a purpose-built proxy to enhance routing and visibility:
- **Health Endpoints:** Uses `/-/healthz` and `/-/readyz` (avoiding `/healthz` to prevent upstream path shadowing). The readiness probe checks Kubernetes informer cache sync.
- **Graceful Shutdown:** Handles `SIGTERM` with a 10-second drain.
- **Structured Logging:** Uses logr/zap for consistent and structured logs.
- **CORS:** The CORS origin allowlist strictly validates against the preview domain.
