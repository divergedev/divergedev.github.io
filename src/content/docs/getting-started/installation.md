---
title: Installation
description: Install the Diverge CLI and Kubernetes Operator via Helm
---

Diverge consists of 6 core binaries built on a hardened `distroless nonroot` base:
- **`diverge-controller`** — Kubernetes operator reconciling `Environment`, `PreviewGroup`, and `AgentTask` CRDs
- **`diverge-server`** — ConnectRPC API server (`:8443` HTTPS and `:8080` in-cluster HTTP), `/mcp` endpoint, LLM metering (`POST /api/v1/agenttask/meter`), and embedded React Web Dashboard
- **`diverge-proxy`** — L7 header/subdomain router and `<diverge-toolbar>` preview banner injector
- **`activator-proxy`** — Scale-to-zero cold-start wake-up proxy with `202 Accepted` browser splash screen
- **`diverge-agent-runner`** (`ghcr.io/divergedev/agent-runner`) — Reference autonomous sandbox runner with Macaroon metering and build-verify-fix loop
- **`diverge`** — Developer CLI and local `stdio` MCP server (`diverge mcp`)

## Helm Chart (Kubernetes Operator)

The recommended way to install Diverge on a Kubernetes cluster is using the official OCI Helm chart:

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace
```

### Production Installation (Server, Web Dashboard & AgentTask Sandboxes)

To enable the ConnectRPC server, embedded Web Dashboard, autonomous `AgentTask` sandboxes with shared Macaroon capability keys, and admission webhooks, create a shared Macaroon root key secret and configure `values.yaml`:

```bash
kubectl create namespace diverge-system
kubectl create secret generic diverge-macaroon-key \
  -n diverge-system \
  --from-literal=root-key="$(openssl rand -hex 32)"
```

```yaml
# values.yaml
server:
  enabled: true
  dashboard:
    enabled: true

sandbox:
  enabled: true
  provider: agent-sandbox # or "pod" ("k8s-pod") when agent-sandbox CRDs are not installed
  macaroonSecretRef:
    name: diverge-macaroon-key
    key: root-key

webhook:
  validatingWebhook:
    enabled: true
  admissionPolicy:
    enabled: true
```

Then upgrade or install the chart:

```bash
helm upgrade --install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  -f values.yaml
```

## CLI Installation

Install the latest `diverge` CLI using the official install script:

```bash
curl -fsSL https://divergedev.com/install.sh | sh
```

If you prefer to inspect the script before executing, download and verify it first:

```bash
curl -fsSL -o install.sh https://raw.githubusercontent.com/divergedev/diverge/main/install.sh
sha256sum install.sh
sh install.sh
```

Or install directly with Go 1.26+:

```bash
go install github.com/divergedev/diverge/cmd/diverge@latest
```

## Binary Download & Container Images

- Pre-built CLI binaries for macOS and Linux (`amd64` / `arm64`): [GitHub Releases](https://github.com/divergedev/diverge/releases/latest)
- Container images on GitHub Container Registry:
  ```bash
  docker pull ghcr.io/divergedev/diverge:latest
  docker pull ghcr.io/divergedev/agent-runner:latest
  ```
