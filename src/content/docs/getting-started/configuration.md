---
title: Configuration
description: Configure Diverge via Helm values, CLI flags, and .diverge.yaml
---

Diverge is configured at the cluster level using Helm values and component flags, and at the repository level using `.diverge.yaml`.

## Helm Chart Values

The Helm chart deploys the controller manager and optional components (`server`, `proxy`, `activatorProxy`, and `sandbox`):

| Key | Default | Description |
|-----|---------|-------------|
| `controller.replicaCount` | `1` | Number of `diverge-controller` replicas |
| `webhook.enabled` | `true` | Enable the GitHub/GitLab webhook listener on the controller |
| `webhook.validatingWebhook.enabled` | `false` | Deploy admission `ValidatingWebhookConfiguration` for `Environment`, `PreviewGroup`, and `AgentTask` |
| `webhook.admissionPolicy.enabled` | `false` | Deploy Kubernetes CEL `ValidatingAdmissionPolicy` resources |
| `proxy.enabled` | `false` | Deploy `diverge-proxy` for L7 header/subdomain routing and banner injection |
| `activatorProxy.enabled` | `false` | Deploy `activator-proxy` for scale-to-zero cold-start wake-up |
| `server.enabled` | `false` | Deploy `diverge-server` (ConnectRPC API, `/mcp` HTTP endpoint, and Web Dashboard) |
| `server.dashboard.enabled` | `true` | Serve the embedded React Web Dashboard when `server.enabled` is true |
| `sandbox.enabled` | `true` | Enable `AgentTask` autonomous coding sandboxes and Macaroon capability auth |
| `sandbox.provider` | `agent-sandbox` | Sandbox provider (`agent-sandbox`, `pod` / `k8s-pod`, or `noop`; automatically falls back to `pod` when `agent-sandbox` CRDs are absent) |
| `sandbox.macaroonSecretRef.name` | `""` | Secret containing the 32-byte `root-key` shared by controller and server |
| `async.provider` | `noop` | Async/storage isolation provider (`kafka`, `temporal`, `redis`, `storage`, `webhook`, `composite`, `noop`) |
| `gateway.tls.enabled` | `false` | Configure HTTPS listener and `cert-manager` annotations on the Gateway |
| `gateway.externalDns.enabled` | `false` | Add `external-dns.alpha.kubernetes.io/hostname` annotations to generated routes |

## Proxy & Activator Flags

### `diverge-proxy` Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--listen-addr` | `:8080` | Proxy HTTP listen address |
| `--probe-addr` | `:8081` | Health and readiness probe address (`/-/healthz`, `/-/readyz`) |
| `--preview-domain` | `preview.localhost` | Base domain for subdomain routing (`<env>.<preview-domain>`) |
| `--inject-banner` | `true` | Inject the floating preview environment banner into HTML responses |
| `--hide-environment-list` | `false` | Omit the list of active environments from 404 responses on unknown subdomains to prevent environment enumeration |

### `activator-proxy` Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--listen-addr` | `:8080` | Activator proxy HTTP listen address |
| `--wake-timeout` | `60s` | Maximum time to wait for a scaled-to-zero pod to pass readiness probes |
| `--wake-splash` | `false` | Serve an auto-refreshing `202 Accepted` HTML splash screen (also triggerable per request via `X-Diverge-Wake-Splash: true`) and `GET /-/wakeup-status` readiness endpoint to browsers while waking a scaled-to-zero preview environment |

## Controller Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--deploy-provider` | `noop` | Deployment provider (`direct`, `argocd`, `knative`, `noop`) |
| `--routing-provider` | `gateway` | Routing provider (`gateway`, `istio`, `composite`, `noop`) |
| `--database-provider` | `none` | Database provider (`schema`, `snapshot`, `neon`, `cnpg`, `cockroach`, `none`) |
| `--notifier-provider` | `noop` | SCM notifier provider (`github`, `gitlab`, `noop`) |
| `--sandbox-provider` | `noop` | AgentTask sandbox provider (`agent-sandbox`, `pod` / `k8s-pod`, `noop`) |
| `--async-provider` | `noop` | Async/storage provider (`kafka`, `temporal`, `redis`, `storage`, `webhook`, `composite`, `noop`) |
| `--feature-flag-provider` | `noop` | OpenFeature flag provider (`flipt`, `unleash`, `flagsmith`, `configmap`, `noop`) |
