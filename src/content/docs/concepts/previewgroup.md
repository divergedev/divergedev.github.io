---
title: PreviewGroups
description: Managing multiple preview services as a single unit
---

As your microservice architecture grows, a single Pull Request (PR) or Merge Request (MR) might touch multiple services at once — or a feature might span multiple open PRs/MRs across separate frontend and backend repositories.

**PreviewGroups** are a higher-level Custom Resource Definition (CRD) introduced in Diverge to manage these interconnected changes as a single logical unit with one shared routing header and preview link.

## What is a PreviewGroup?

A `PreviewGroup` acts as the parent controller for a multi-service preview. Whether created for one PR/MR touching several services in a monorepo or composed from multiple open PRs/MRs across repositories (`v0.29+`), it coordinates all participating workloads together.

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

## Composing Multiple Open PRs / MRs (`v0.29+`)

When frontend, backend, or API changes live in separate open PRs or MRs, you can compose them into one shared `PreviewGroup` so every request carrying the shared routing header hits all joined preview services together:

1. **PR / MR Slash Commands**:
   Comment `/diverge group feat-checkout` (aliases: `/diverge join`, `/diverge attach`; optional `--db-mode <shared|schema|snapshot|fresh|cnpg|neon>`) on each open backend and frontend PR/MR. Subsequent commits pushed to any joined PR/MR automatically sync updated container images into the shared group, and closing or merging one PR/MR detaches only its services — automatically deleting the `PreviewGroup` when the last active MR leaves. Run `/diverge ungroup [name]` (aliases: `/diverge leave`, `/diverge detach`) to detach manually.

   :::note
   Webhook-driven shared `PreviewGroup`s across repositories require cluster-scoped controller RBAC (`rbac.namespaceScoped=false`).
   :::

2. **CLI (`diverge preview join` / `leave`)**:
   ```bash
   # Combine two existing PR/MR Environment CRs into one shared preview URL
   diverge preview join feat-checkout \
     --from-env frontend/pr-acme-web-101 \
     --from-env backend/pr-acme-payments-42 \
     --base-url https://staging.acme.dev

   # Detach one merged MR's services (auto-deletes the group when empty)
   diverge preview leave feat-checkout --project acme/payments-api --mr 42
   ```

3. **CI / CD (Shared Branch Slug)**:
   Pass the same `group` / `diverge_group` slug (for example a shared feature branch name) across repositories in CI so pipelines join on deploy and detach only the closing PR/MR on teardown:
   - GitHub Action (`divergedev/diverge@v0.29.0`): set `group: ${{ github.head_ref }}`
   - GitLab CI Component (`divergedev/diverge/preview@v0.29.0`): set `diverge_group: "$CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"`

4. **Web Dashboard & MCP**:
   In the Web Dashboard, click **Compose Preview Group** (on **Preview Groups**) or **Join Services** / per-service **Detach** (on **Preview Group Detail**). AI assistants can invoke `diverge_join_preview_group` and `diverge_leave_preview_group` (gated by `--allow-destructive` on `diverge mcp`).

### How Multi-MR Composition Works

- **Ownership & Slug Normalization**: Composed groups are labeled `divergedev.com/composed: "true"` with per-member provenance stored in `divergedev.com/group-members`. Group names are deterministically normalized via `NormalizeGroupName` (truncating and appending an 8-character SHA-256 suffix when longer than 63 characters). SCM provider + project ownership guards prevent one PR/MR from silently overwriting another MR's service unless `--force` is passed.
- **Source-Bound Standalone Hibernation**: When an existing standalone PR `Environment` joins a composed `PreviewGroup`, Diverge records `divergedev.com/attached-previewgroup` and `divergedev.com/group-hibernated`, hibernating the redundant standalone pod once the group child becomes ready and restoring it upon detach while preserving independent manual pauses.
- **Database Policy**: By default, each joined MR preserves its own per-service database configuration. Pass `--db-mode` (CLI/slash command), `shared_database_mode` (MCP), or choose a shared mode in the Dashboard Composer to provision a single shared group-level database across all services in the `PreviewGroup`.

## Multi-Cluster Spoke Federation (`spec.clusterRef`)

A `PreviewGroup` can burst all of its child `Environment` workloads onto a remote spoke Kubernetes cluster by setting `spec.clusterRef` (or via `.diverge.yaml` `deploy.cluster_ref` / `diverge preview create --cluster <name> --cluster-secret <secret>`), while individual entries in `spec.services[]` can override `clusterRef` (including `clusterRef: {}` to pin a specific service back to `local`). Once provisioned, each child environment pins `status.targetCluster` immutably and surfaces its resolved target cluster in `status.services[].targetCluster`, `diverge preview status`, and the Web Dashboard.
