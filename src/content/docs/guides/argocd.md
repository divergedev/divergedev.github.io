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
