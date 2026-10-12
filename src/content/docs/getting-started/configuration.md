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
| `proxy.enabled` | `true` | Deploy `diverge-proxy` for L7 header/subdomain routing and banner injection |
| `activatorProxy.enabled` | `false` | Deploy `activator-proxy` for scale-to-zero cold-start wake-up |
| `server.enabled` | `false` | Deploy `diverge-server` (ConnectRPC API, `/mcp` HTTP endpoint, and Web Dashboard) |
| `server.dashboard.enabled` | `false` | Serve the embedded React Web Dashboard from `diverge-server` |
| `sandbox.enabled` | `false` | Enable `AgentTask` autonomous coding sandboxes and Macaroon capability auth |
| `sandbox.provider` | `agent-sandbox` | Sandbox provider (`agent-sandbox` or `noop`) |
| `sandbox.macaroonSecretRef.name` | `""` | Secret containing the 32-byte `root-key` shared by controller and server |

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
| `--wake-splash` | `true` | Serve an auto-refreshing `202 Accepted` HTML splash screen (`X-Diverge-Wake-Splash: true`) and `GET /-/wakeup-status` readiness endpoint to browsers while waking a scaled-to-zero preview environment |

## Controller Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--deploy-provider` | `noop` | Deployment provider (`direct`, `argocd`, `knative`, `noop`) |
| `--routing-provider` | `gateway` | Routing provider (`gateway`, `istio`, `composite`, `noop`) |
| `--database-provider` | `none` | Database provider (`schema`, `snapshot`, `neon`, `cnpg`, `cockroach`, `none`) |
| `--notifier-provider` | `noop` | SCM notifier provider (`github`, `gitlab`, `noop`) |
| `--sandbox-provider` | `noop` | AgentTask sandbox provider (`agent-sandbox`, `noop`) |
