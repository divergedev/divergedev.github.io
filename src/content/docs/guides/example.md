---
title: "Example: GitLab + Kustomize"
description: End-to-end testing guide for Diverge with GitLab, Kustomize, schema-per-env database isolation, and Istio Ambient.
---

This guide walks through testing Diverge with a GitLab-based fintech platform using Kustomize deployments, schema-per-environment database isolation, and Istio Ambient mTLS.

## Prerequisites

- A Kubernetes cluster with:
  - Argo CD installed
  - Istio (Ambient mode enabled)
  - Diverge controller deployed via Helm
- A GitLab project with a `.diverge.yaml` config
- A PostgreSQL or AlloyDB instance accessible from the cluster

## 1. Deploy Diverge

Install the Diverge Helm chart with GitLab + schema provider flags:

```bash
helm install diverge oci://ghcr.io/divergedev/diverge/charts/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set controller.args[0]="--notifier-provider=gitlab" \
  --set controller.args[1]="--database-provider=schema" \
  --set controller.env.DIVERGE_DB_HOST="10.0.0.5" \
  --set controller.env.DIVERGE_DB_PORT="5432" \
  --set controller.env.DIVERGE_DB_USER="diverge" \
  --set controller.env.DIVERGE_DB_NAME="acmepay" \
  --set controller.env.DIVERGE_DB_SSLMODE="require" \
  --set-string controller.envFrom[0].secretRef.name="diverge-db-password"
```

## 2. Configure GitLab Webhook

In your GitLab project → **Settings** → **Webhooks**:

| Field | Value |
|-------|-------|
| URL | `https://diverge.yourdomain.com/webhook/gitlab` |
| Secret token | `openssl rand -hex 32` (save this) |
| Trigger | **Merge request events** |

Create the webhook secret in the cluster:

```bash
kubectl create secret generic diverge-webhook-secret \
  --namespace diverge-system \
  --from-literal=gitlab-token=YOUR_TOKEN_HERE
```

## 3. Create a `.diverge.yaml`

Add this to your repository root. This example uses Kustomize overlays and schema-per-env isolation:

```yaml
version: "1"

services:
  payments-api:
    paths:
      - "services/payments-api/**"
    image:
      repository: "registry.gitlab.com/acmepay/platform/payments-api"
      tag_template: "mr-{{.MR}}"
    source_type: kustomize
    kustomize:
      path: "deploy/payments-api/overlays/preview"

  ledger-service:
    paths:
      - "services/ledger-service/**"
    image:
      repository: "registry.gitlab.com/acmepay/platform/ledger-service"
      tag_template: "mr-{{.MR}}"
    source_type: kustomize
    kustomize:
      path: "deploy/ledger-service/overlays/preview"

defaults:
  deploy:
    mode: delta
    namespace_labels:
      istio.io/dataplane-mode: ambient
  routing:
    mode: header
    baseline_namespace: staging
    header_key: x-diverge-env
    domain: preview.acmepay.dev
  database:
    mode: schema
    connection_ref: alloydb-staging-secret
  lifecycle:
    ttl: 72h
    cleanup_on_merge: true

notifications:
  provider: gitlab
  comment_on_create: true
  comment_on_ready: true
  comment_on_destroy: true
```

## 4. Test the Full Lifecycle

### 4.1 Create a Merge Request

Push a branch that modifies a service:

```bash
git checkout -b test/diverge-preview
echo "// trigger build" >> services/payments-api/main.go
git add -A && git commit -m "test: trigger Diverge preview"
git push origin test/diverge-preview
```

Create an MR in GitLab targeting `main`.

### 4.2 Verify: Environment CR Created

```bash
kubectl get environments -A
# Expected: an Environment CR with phase=Pending
```

```bash
kubectl describe environment -n diverge-system preview-mr-123
# Look for conditions: NamespaceReady, DatabaseReady, RoutingReady, ServicesReady
```

### 4.3 Verify: Schema Provisioned

The SchemaProvider creates a PostgreSQL schema named `diverge_env_<sanitized-name>`:

```bash
psql -h $DB_HOST -U diverge -d acmepay -c \
  "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'diverge_env_%';"
```

A Kubernetes Secret containing `DATABASE_URL` is also created in the preview namespace:

```bash
kubectl get secret -n diverge-preview-mr-123 diverge-db-url -o yaml
```

### 4.4 Verify: Namespace Labels

```bash
kubectl get ns diverge-preview-mr-123 --show-labels
# Expected: istio.io/dataplane-mode=ambient, diverge.io/environment=preview-mr-123
```

### 4.5 Verify: MR Comment

Check your GitLab MR — Diverge should have posted a comment with:
- Preview URL (e.g., `https://preview.acmepay.dev`)
- Header value to use (e.g., `x-diverge-env: mr-123`)
- List of deployed services

### 4.6 Verify: Commit Status

In the MR pipeline section, you should see `diverge/preview` with a green checkmark:

| MR State | Expected Status |
|----------|----------------|
| Just opened | `pending` |
| Deploying | `running` |
| Environment healthy | `success` ✅ |
| Error during provisioning | `failed` |
| MR closed before ready | `canceled` |

### 4.7 Test: Merge Gating

Configure a **protected branch rule** in GitLab to require the status check:

1. Go to **Settings** → **Repository** → **Protected branches**
2. Select `main`
3. Under **Status checks**, add `diverge/preview`

Now the **Merge** button is disabled until the preview environment reports `success`.

### 4.8 Test: Teardown

Merge or close the MR, then verify cleanup:

```bash
# Environment transitions to Terminating → deleted
kubectl get environments -A

# Schema dropped
psql -h $DB_HOST -U diverge -d acmepay -c \
  "SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'diverge_env_%';"
# Expected: 0 rows

# Namespace deleted
kubectl get ns diverge-preview-mr-123
# Expected: NotFound

# ArgoCD Application cleaned up
kubectl get applications -n argocd | grep preview-mr-123
# Expected: no results
```

## 5. Testing with `curl`

Once the environment is running, test header-based routing:

```bash
# Route to preview environment
curl -H "x-diverge-env: mr-123" https://preview.acmepay.dev/api/v1/health

# Route to baseline (no header)
curl https://preview.acmepay.dev/api/v1/health
```

## 6. Troubleshooting

### Webhook not firing
```bash
# Check webhook delivery in GitLab: Settings → Webhooks → Recent events
# Check controller logs:
kubectl logs -n diverge-system deploy/diverge-controller -f | grep webhook
```

### Schema not created
```bash
# Check controller logs for database errors:
kubectl logs -n diverge-system deploy/diverge-controller -f | grep -i "schema\|database"

# Verify connectivity:
kubectl run psql-test --rm -it --image=postgres:16 -- \
  psql "host=$DB_HOST port=5432 user=diverge dbname=acmepay sslmode=require"
```

### Commit status not posted
```bash
# Verify GitLab token has api scope:
kubectl logs -n diverge-system deploy/diverge-controller -f | grep -i "status\|commit"
```

### Namespace labels not applied
```bash
kubectl describe environment -n diverge-system preview-mr-123 | tail -20
```

:::tip
For CI image builds, add a GitLab CI job scoped to MR pipelines that builds and pushes images tagged `mr-$CI_MERGE_REQUEST_IID` to your container registry.
:::
