---
title: Quick Start
description: Get started with Diverge
---

## Prerequisites
- Kubernetes cluster
- Helm
- Istio or Gateway API installed

## Installation

```bash
helm install diverge oci://ghcr.io/divergedev/charts/diverge
```

## Setup

1. Configure your webhook for GitLab or GitHub.
2. Add a `.diverge.yaml` to your repository:
   ```yaml
   version: "1"
   defaults:
     deploy:
       mode: delta
     routing:
       mode: header
       baseline_namespace: staging
   ```
3. Open a Merge Request (MR). Diverge will automatically create a preview environment.
4. Verify using the CLI:
   ```bash
   diverge list
   diverge open
   ```
