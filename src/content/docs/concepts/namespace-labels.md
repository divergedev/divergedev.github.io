---
title: Namespace Labels
description: How to apply custom labels to preview namespaces for service mesh integration and policy enforcement.
---

Diverge allows you to apply custom Kubernetes labels to preview namespaces via the `namespaceLabels` field in your Environment spec. This is particularly useful for enabling service mesh features like Istio Ambient mode.

## Use Case: Istio Ambient Mesh

Istio's Ambient mode provides zero-trust mTLS without sidecars. To enable it for preview environments, add the required label:

```yaml
apiVersion: diverge.io/v1alpha1
kind: Environment
metadata:
  name: preview-mr-42
spec:
  deploy:
    mode: delta
    namespaceLabels:
      istio.io/dataplane-mode: ambient
```

When the controller creates or updates the preview namespace, this label is merged into the namespace's metadata, automatically enrolling it in Istio Ambient mesh.

## Label Protection

Labels prefixed with `diverge.io/` are **protected** and cannot be overridden by user-specified `namespaceLabels`. This ensures that Diverge's internal labels (used for tracking and lifecycle management) remain intact.

```yaml
# These are protected — user values will be ignored
diverge.io/environment: preview-mr-42
diverge.io/managed-by: diverge

# These are user-controlled
istio.io/dataplane-mode: ambient
team: platform
```

## Validation

All label keys and values are validated using Kubernetes' built-in validation utilities (`validation.IsQualifiedName` for keys, `validation.IsValidLabelValue` for values) before being applied. Invalid labels will cause the reconciliation to fail with a descriptive error.

:::caution
Label keys must conform to the Kubernetes label format: an optional DNS subdomain prefix followed by a `/` and a name segment (e.g., `example.com/my-label`). Values must be 63 characters or fewer.
:::

## How It Works

The controller uses `CreateOrUpdate` to idempotently manage the preview namespace:

1. Merges user-specified `namespaceLabels` into the namespace
2. Skips any labels with the `diverge.io/` prefix (protected)
3. Applies Diverge's own tracking labels
4. Reports `NamespaceReady` condition on success
