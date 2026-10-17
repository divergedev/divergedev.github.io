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
- **Gateway API**: Diverge natively generates Kubernetes Gateway API `HTTPRoute` and `GRPCRoute` resources to perform header-based routing, which Istio Ambient consumes.
- **Convenience Annotations**: Set `divergedev.com/ambient-mesh: "true"` and `divergedev.com/waypoint: <waypoint-name>` on an `Environment` with `spec.deploy.namespace: create` to automatically apply `istio.io/dataplane-mode: ambient` and `istio.io/use-waypoint: <waypoint-name>` to the created preview namespace.
- **Knative Kourier**: Fully compatible with Knative's Kourier ingress for namespaces running serverless scale-to-zero workloads.

### Prerequisites

To use L7 header-based routing with Istio Ambient:
- **Waypoint Proxy**: Deploy an Istio Waypoint proxy in the target namespace (e.g. `istioctl waypoint apply --namespace <namespace>`).
- **Waypoint Enrollment**: Ensure the namespace or target workloads are labeled with `istio.io/use-waypoint: <waypoint-name>` (or annotate the `Environment` with `divergedev.com/waypoint: <waypoint-name>`) so L7 traffic is redirected to the Waypoint proxy for policy and routing enforcement.
- **Ingress Gateway**: For external traffic entering the cluster, configure an Ingress Gateway (such as Istio Ingress Gateway or a Gateway API Gateway) with appropriate listeners and routing to forward requests to the Waypoint proxy or services. Use `divergedev.com/gateway-namespace: <ns>` when the Gateway lives in a separate namespace from your baseline services.

## Cross-Namespace `ReferenceGrant`, GAMMA East-West Routing & `parentRef` Disambiguation

- **Automatic Cross-Namespace `ReferenceGrant` (`spec.deploy.namespace: create`)**: When an `Environment` deploys its preview workload into an isolated namespace (`env.PreviewNamespace()`) that differs from the route namespace, `GatewayRouter` automatically reconciles a `gateway.networking.k8s.io/v1beta1` `ReferenceGrant` (`diverge-<env>-grant`) in `env.PreviewNamespace()` granting route-namespace `HTTPRoute` and `GRPCRoute` access to each changed preview `Service` (`<env>-<service>`).
- **GAMMA East-West Service Mesh Routing (`--enable-gamma`)**: Pass `--enable-gamma` to `diverge-controller` so `PreviewGroupReconciler` configures child `Environment`s' `spec.serviceConfig.serviceName` with the baseline service name; `GatewayRouter` creates the GAMMA mesh `HTTPRoute` from `spec.serviceConfig.serviceName` (while `EnvironmentReconciler` does not take `--enable-gamma` and uses `spec.serviceConfig.serviceName` when set directly on the `Environment`).
- **Gateway API `parentRef` Disambiguation (`Gateway` vs. `Service`)**: North-south ingress routes attach to a `Gateway` (`group: gateway.networking.k8s.io`, `kind: Gateway`), while east-west GAMMA routes attach to a Kubernetes `Service` (`group: ""`, `kind: Service`). So services named `payment-gateway` or Gateways named `prod-ingress` work seamlessly without ambiguous substring heuristics, `GatewayRouter` resolves `parentRef` kind in the following precedence order:
  1. **Explicit `Kind/Name` Prefix (`Gateway/<name>` or `Service/<name>`)**: Set `spec.serviceConfig.parentRef` to `Gateway/prod-ingress` or `Service/payment-gateway`.
  2. **Explicit Annotation (`divergedev.com/parent-kind: Gateway | Service`)**: Annotate the `Environment` with `divergedev.com/parent-kind: "Gateway"` or `divergedev.com/parent-kind: "Service"`.
  3. **Automatic Cluster `Gateway` Lookup**: Queries the cluster for a `gateway.networking.k8s.io/v1` `Gateway` matching `parentRef` in the target gateway namespace (`divergedev.com/gateway-namespace` or the route namespace) before falling back to heuristic name matching (`gateway` / `waypoint`).

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
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-123
  annotations:
    divergedev.com/external-dns: "true"
    divergedev.com/cluster-issuer: "letsencrypt-prod"
spec:
  routing:
    mode: subdomain
    baseDomain: preview.example.com
```

### Automatic `external-dns` & `cert-manager` Annotation Propagation

On subdomain `HTTPRoute` and `GRPCRoute` resources, `GatewayRouter` automatically propagates DNS and TLS management annotations from the `Environment`:

- **`external-dns`**:
  - `divergedev.com/external-dns: "true"` propagates `external-dns.alpha.kubernetes.io/hostname: <env>.<baseDomain>` onto the generated route.
  - `divergedev.com/external-dns-hostname: "<hostname>"` propagates an explicit custom hostname override (`external-dns.alpha.kubernetes.io/hostname: <hostname>`).
  - `divergedev.com/external-dns-ttl: "60"` propagates `external-dns.alpha.kubernetes.io/ttl: "60"`.
- **`cert-manager`**:
  - `divergedev.com/cluster-issuer: "letsencrypt-prod"` propagates `cert-manager.io/cluster-issuer: "letsencrypt-prod"` onto the generated route.
  - `divergedev.com/issuer: "<issuer-name>"` propagates `cert-manager.io/issuer: "<issuer-name>"`.

### DNS & TLS Requirements

To support dynamic subdomains without manual DNS or certificate management:

- **Wildcard DNS or `external-dns`**: Configure a wildcard DNS record (e.g., `*.preview.example.com`) pointing to your Ingress Gateway's external IP/CNAME, or annotate the `Environment` with `divergedev.com/external-dns: "true"`.
- **Wildcard TLS Certificate or `cert-manager`**: Provision a wildcard certificate for `*.preview.example.com`, or annotate the `Environment` with `divergedev.com/cluster-issuer: "letsencrypt-prod"` when using `cert-manager`'s Gateway API shim.

### Routing Mode Comparison

| Feature / Aspect | Header-Based Routing | Subdomain Routing | Namespace Routing |
| :--- | :--- | :--- | :--- |
| **Routing Mechanism** | L7 HTTP Header (`x-diverge-env`) | Host / SNI (`<env>.preview.domain`) | Dedicated K8s Namespace |
| **Frontend / Browser Support** | Requires browser extension or proxy injection | Native browser support (clickable URLs) | Native browser support |
| **DNS / TLS Setup** | Single static domain & cert | Wildcard DNS (`*.domain`) & wildcard TLS | Wildcard or per-namespace DNS/TLS |
| **Third-Party Webhooks** | Challenging (webhooks lack custom headers) | Native (dedicated callback URL per PR) | Native (dedicated callback URL per PR) |
| **Service Sharing (Deltas)** | Shared baseline with delta overrides | Shared baseline with delta overrides | Full duplication or cross-namespace mesh |
| **Resource Efficiency** | Highest (only changed pods deploy) | Highest (only changed pods deploy) | Lower (deploys full stack per env) |

## Diverge Proxy & Activator Proxy

Diverge includes purpose-built proxies to enhance L7 routing, cold-start wake-up, and security:
- **Health Endpoints:** Uses `/-/healthz` and `/-/readyz` (avoiding `/healthz` to prevent upstream path shadowing). The readiness probe checks Kubernetes informer cache sync.
- **Hide Environment List (`--hide-environment-list`):** On public or shared preview domains, pass `--hide-environment-list` to `diverge-proxy` (`true` by default in hardened deployments or configurable via proxy args) so unknown preview hostnames return a generic `404 Environment not found` response without enumerating active environment names.
- **Wake-Up Splash Page (`--wake-splash`):** On `activator-proxy`, `--wake-splash` (`true` by default) returns a `202 Accepted` auto-refreshing HTML splash screen (`X-Diverge-Wake-Splash: true`) and readiness endpoint (`GET /-/wakeup-status?env=<env>`) when browsers access a scaled-to-zero preview environment.
- **Graceful Shutdown:** Handles `SIGTERM` with a 10-second drain.
- **Structured Logging:** Uses logr/zap for consistent and structured logs.
- **CORS:** The CORS origin allowlist strictly validates against the preview domain.
