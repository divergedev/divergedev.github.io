---
title: Installation
description: Install Diverge
---

Diverge provides a single consolidated Docker image containing both the controller and the proxy components. The image is built on a `distroless nonroot` base for enhanced security. You can select which component to run using the Kubernetes `command`.

## Helm Chart

The recommended way to install Diverge is using the official Helm chart:

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge --namespace diverge-system --create-namespace
```

### Deploying the ConnectRPC Server

To enable the ConnectRPC server for API access without `kubectl`, configure your `values.yaml`:

```yaml
# values.yaml
server:
  enabled: true
```

Then upgrade or install the chart:

```bash
helm upgrade --install diverge oci://ghcr.io/divergedev/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  -f values.yaml
```

## Binary Download

Download the Diverge CLI from [GitHub Releases](https://github.com/divergedev/diverge/releases/latest).

## Docker Image

The Docker image is available on GitHub Container Registry:

```bash
docker pull ghcr.io/divergedev/diverge:latest
```

Diverge is built using Go 1.26.
