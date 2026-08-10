---
title: Lifecycle
description: Detailed overview of the Diverge environment lifecycle and teardown process.
---

Diverge provides a robust, state-machine driven lifecycle for preview environments, ensuring they are reliably provisioned and cleanly torn down to prevent resource leaks.

## Environment Phases

The `Environment` Custom Resource transitions through the following phases:

1. **Pending**: The environment has been created, and the controller is analyzing dependencies and preparing resources.
2. **Deploying**: The underlying infrastructure (Argo CD applications, database provisioning) is actively being created.
3. **Running**: All deployments are healthy and the preview environment is fully accessible.
4. **Failed**: An error occurred during deployment or provisioning.
5. **Terminating**: The environment is being actively torn down.

## Status Conditions

Diverge uses Kubernetes standard status conditions to provide granular feedback during the lifecycle:
- `NamespaceReady`: Indicates if the target namespace is created and configured.
- `DatabaseReady`: Indicates if the requested database mode has been successfully provisioned.
- `RoutingReady`: Indicates if the proxy/gateway routes are configured.
- `DeployReady`: Indicates if the ArgoCD applications have successfully synced and become healthy.

## Teardown and Cleanup

Zero-zombie environments are a core guarantee of Diverge.

### Finalizer-Based Teardown

Diverge uses a strict finalizer-based approach (`diverge.io/finalizer`). When an environment is deleted, the Kubernetes API blocks the deletion until the Diverge Controller successfully cleans up all external resources (Argo CD applications, cloned databases, routing rules), ensuring no orphaned infrastructure is left behind.

### Auto-Expiry (TTL)

Environments can be configured with a Time-To-Live (TTL). The controller enforces TTL auto-expiry and will automatically trigger deletion and requeue the environment for cleanup once the TTL is reached.

### Cleanup on Merge/Close

When the configured webhook receives a merge or close event from GitHub or GitLab, Diverge will automatically delete the corresponding `Environment` CR, triggering the finalizer cleanup process immediately.

## Observability

During all state transitions, Diverge records standard Kubernetes Events (`Normal` or `Warning`), giving you complete visibility into the lifecycle history via `kubectl describe env <name>`.
