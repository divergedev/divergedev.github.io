---
title: Installation
description: Install Diverge
---

Diverge provides a single consolidated Docker image containing both the controller and the proxy components. The image is built on a `distroless nonroot` base for enhanced security. You can select which component to run using the Kubernetes `command`.

## Helm Chart

The recommended way to install Diverge is using the official Helm chart:

```bash
helm repo add diverge https://divergedev.github.io/helm-charts
helm repo update
helm install diverge diverge/diverge --namespace diverge-system --create-namespace
```

## Binary Download

Download the Diverge CLI from [GitHub Releases](https://github.com/divergedev/diverge/releases/latest).

## Docker Image

The Docker image is available on GitHub Container Registry:

```bash
docker pull ghcr.io/divergedev/diverge:latest
```

Diverge is built using Go 1.26.
