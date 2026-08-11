---
title: Multi-Repo Previews
description: Preview environments for polyrepo microservices architectures
---

## How It Works

In a polyrepo architecture, each service lives in its own repository. When a developer opens an MR on one service, Diverge:

1. Receives the webhook from the SCM (GitLab/GitHub)
2. Deploys a **single preview pod** for the changed service
3. Creates an HTTPRoute that routes tagged traffic to the preview
4. Everything else falls through to the shared baseline environment

Only the changed service gets a preview pod. The service mesh handles routing — no wasted resources.

## Architecture

```text
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│  web-app     │───▶│  gateway     │───▶│ payments-api         │
│  (baseline)  │    │  (baseline)  │    │ ┌──────────────────┐ │
└──────────────┘    └──────────────┘    │ │ baseline (main)  │ │
                                        │ ├──────────────────┤ │
                                        │ │ PREVIEW (MR-42)  │◀── x-preview-id: 42
                                        │ └──────────────────┘ │
                                        └──────────┬───────────┘
                                                   │
                                        ┌──────────▼───────────┐
                                        │ accounts-api         │
                                        │ (baseline)           │
                                        └──────────────────────┘
```

## `.diverge.yaml`

Each service repo contains a `.diverge.yaml` that configures preview behavior:

```yaml
apiVersion: diverge.io/v1alpha1
kind: ServicePreview
metadata:
  name: payments-api
spec:
  namespace: app-billing
  serviceName: payments-api
  port: 8080
  routing:
    headerKey: x-preview-id
```

## Try It

Run the [bank demo](https://github.com/divergedev/demo) to see multi-repo previews in action with k3d + Envoy Gateway.

## Production Setup

In production, replace Envoy Gateway with Istio Waypoint Proxies for full service mesh integration:

| Demo | Production |
|------|------------|
| k3d | GKE / EKS |
| Envoy Gateway | Istio Waypoint |
| `curl -H x-preview-id` | OTel Baggage propagation |
| Manual scripts | Diverge controller (webhook-driven) |
