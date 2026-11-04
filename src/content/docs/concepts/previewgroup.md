---
title: PreviewGroups
description: Managing multiple preview services as a single unit
---

As your microservice architecture grows, a single Pull Request (PR) or Merge Request (MR) might touch multiple services at once. For example, you might update both an API and a frontend application in the same branch.

**PreviewGroups** are a higher-level Custom Resource Definition (CRD) introduced in Diverge to manage these interconnected changes as a single logical unit.

## What is a PreviewGroup?

A `PreviewGroup` acts as the parent controller for a specific PR/MR. While an `Environment` resource represents a single deployed service (like the `api` or `web`), a `PreviewGroup` represents the **entire PR**.

It is responsible for:
- Creating child `Environment` resources for every service changed in the PR.
- Updating them when you push new commits.
- Cleaning up "orphan" environments (if you revert a change to a service, the PreviewGroup deletes its preview environment).
- Creating cross-namespace `ReferenceGrant` resources required by Gateway API.
- Integrating with Notifiers to post single, consolidated comments to your GitHub or GitLab MR.

## Lifecycle Management

When you open a Merge Request, Diverge detects the changed services based on the paths defined in your `.diverge.yaml`. 

1. **Create on Open**: Diverge creates a `PreviewGroup` resource named after the MR (e.g., `mr-123`). The PreviewGroup then spins up child `Environment` resources for all changed services.
2. **Update on Push**: If you push a new commit that changes an additional service, Diverge updates the PreviewGroup. The PreviewGroup immediately spins up the newly affected service. If a service is removed from the PR, the PreviewGroup cleans it up.
3. **Teardown on Merge**: Once the MR is merged or closed, the PreviewGroup is deleted. Because of Kubernetes owner references and label-based ownership tracking, all child Environments and associated resources are garbage collected automatically.

## Label-Based Ownership

PreviewGroups track their child resources using Kubernetes labels. Every resource created for a specific PR will have standard Diverge labels:

```yaml
divergedev.com/preview-group: "mr-123"
divergedev.com/managed-by: "diverge"
```

This ensures robust tracking and cleanup, even if manual modifications occur.

## Example Configuration

When Diverge processes an MR (or when you run `diverge preview create`), it generates a cluster-scoped `PreviewGroup` Custom Resource:

```yaml
apiVersion: divergedev.com/v1alpha1
kind: PreviewGroup
metadata:
  name: mr-123
spec:
  source:
    provider: gitlab
    project: "acme/platform"
    mr: 123
    branch: "feat/checkout-redesign"
  routing:
    headerKey: x-diverge-env
    headerValue: mr-123
  lifecycle:
    ttl: 24h
    cleanupOnMerge: true
  services:
    - name: api
      namespace: default
      mode: image
      image: registry.example.com/api:mr-123
      port: 8080
    - name: web
      namespace: default
      mode: baseline
```

The controller takes this single definition and reconciles it into the individual routes, deployments, databases, and cross-namespace grants required for the full preview environment to function smoothly.
