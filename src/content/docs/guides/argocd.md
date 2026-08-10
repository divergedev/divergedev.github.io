---
title: Argo CD Integration
description: Argo CD setup
---

Diverge integrates directly with Argo CD to manage preview environments.

Instead of relying on `ApplicationSet`, Diverge's controller directly creates Argo CD `Application` CRs per changed service using Server-Side Apply (SSA).

This direct approach is production-ready and includes:
- **Namespace traversal protection (denylist)**: Ensures deployments stay in permitted boundaries.
- **`resources-finalizer`**: Guarantees a clean teardown when preview environments expire.
- **Input validation**: Enforces RFC 1123 naming constraints and applies safe hashing.
- **Parallel applies**: Uses `errgroup` for high-performance concurrent deployments.
- **SSA with ForceOwnership**: Confirms robust declarative management and self-healing.

## Supported Source Types

The Diverge Argo CD Generator supports generating Application manifests for both **Helm** and **Kustomize** `sourceTypes`. You are not limited to just Helm charts.

### Kustomize Example

Here is how you can configure a service to use Kustomize in your `.diverge.yaml`:

```yaml
version: "1"
services:
  frontend:
    paths: ["services/frontend/**"]
    image:
      repository: registry.example.com/frontend
      tag_template: "mr-{{.MR}}"
    kustomize:
      path: k8s/overlays/preview
```

When Diverge detects changes, it will dynamically generate an Argo CD Application resource with the `sourceType: kustomize`, automatically injecting the correct image overrides for your preview environment.
