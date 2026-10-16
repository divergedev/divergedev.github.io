---
title: Delta Deployments
description: Learn about Delta Deployments
---

Delta Deployments are a core concept in Diverge. Rather than cloning your entire microservice architecture, Diverge identifies which specific services have changed in your Merge Request and deploys only those modified services.

## How it works
1. **Dependency Analysis:** Diverge checks your Git diff against configured paths.
2. **Selective Deployment:** Only the modified services are deployed to the cluster.
3. **Traffic Routing:** Using header-based routing, traffic intended for the preview environment is routed to the new, delta deployments. Any requests to unmodified services gracefully fall back to your shared baseline environment.

This approach significantly reduces deployment time and cluster resource usage.

## Baseline Drift Detection & Auto-Refresh

Because delta previews rely on shared baseline services and baseline `ConfigMap`/`Secret` configurations, changes to the baseline cluster while a PR is open can cause subtle configuration drift.

Diverge automatically computes a deterministic SHA-256 fingerprint (`divergedev.com/baseline-fingerprint`) over matched baseline `Deployment` pod templates (`Containers`, `InitContainers`, `env`, `envFrom`) and referenced `ConfigMap`s/`Secret`s (including projected volume `ConfigMap`/`Secret` sources), watching baseline `Deployment` and `ConfigMap` updates in real time:

- **`divergedev.com/drift-policy: "warn"` (default)**: Sets condition `BaselineDriftDetected=True` (`Reason: BaselineUpdated`), emits a `BaselineDriftDetected` Warning event, and surfaces `⚠️ drift` in `diverge top` for active environments (`💤 hibernated` takes display precedence while an environment is scaled to zero).
- **`divergedev.com/drift-policy: "sync"`**: Automatically re-runs `Deployer.Deploy`, injects the updated `divergedev.com/baseline-fingerprint` into preview pod templates to trigger a rolling restart, and emits a `BaselineSynced` Normal event.
- **`divergedev.com/drift-policy: "ignore"`**: Disables baseline drift checks for the environment.
