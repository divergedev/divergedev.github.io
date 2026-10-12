---
title: GitLab Integration
description: Complete guide to using Diverge with GitLab — webhooks, CI/CD pipelines, MR comments, and self-hosted setup.
---

Diverge provides first-class GitLab integration for automatic preview environments on every Merge Request. This guide covers webhook setup, CI/CD pipelines with change detection, sticky MR comments, merge gating, and self-hosted GitLab configuration.

## 1. Controller Setup

Install the Diverge controller with GitLab notifier enabled:

```bash
helm repo add diverge https://divergedev.github.io/diverge
helm repo update

helm install diverge diverge/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set notifierProvider=gitlab \
  --set controller.env.DIVERGE_NOTIFIER_TOKEN=<gitlab-api-token> \
  --set controller.env.DIVERGE_WEBHOOK_SECRET=<webhook-secret>
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DIVERGE_NOTIFIER_TOKEN` | GitLab API token with `api` scope (personal or project access token) |
| `DIVERGE_WEBHOOK_SECRET` | Shared secret for webhook signature validation |

### Controller Flags

| Flag | Description |
|------|-------------|
| `--notifier-provider=gitlab` | Enable GitLab MR comments and commit statuses |
| `--gitlab-url=https://gitlab.example.com` | Base URL for self-hosted GitLab (omit for gitlab.com) |

---

## 2. Webhook Configuration

Register webhooks in your GitLab project (or group) to trigger automatic environment lifecycle.

Navigate to **Settings → Webhooks → Add new webhook**:

### Single-Service Environments

| Setting | Value |
|---------|-------|
| **URL** | `https://diverge.yourdomain.com/gitlab-webhook` |
| **Secret token** | Your `DIVERGE_WEBHOOK_SECRET` value |
| **Trigger** | ✅ Merge request events<br/>✅ Comments (`Note Hook` — required for interactive `/diverge` slash commands) |

### Multi-Service Environments (PreviewGroups)

Add a second webhook for coordinated multi-service deployments:

| Setting | Value |
|---------|-------|
| **URL** | `https://diverge.yourdomain.com/gitlab-previewgroup-webhook` |
| **Secret token** | Your `DIVERGE_WEBHOOK_SECRET` value |
| **Trigger** | ✅ Merge request events |

:::note
Webhook authentication uses constant-time comparison of the `X-Gitlab-Token` header against your configured secret, preventing timing attacks.
:::

### Webhook Events Handled

| Event / Action | Diverge Behavior |
|----------------|-----------------|
| `Merge Request Hook`: `open`, `reopen` | Creates `Environment` / `PreviewGroup` CR |
| `Merge Request Hook`: `update` (new push) | Updates the CR with new commit SHA |
| `Merge Request Hook`: `merge`, `close` | Deletes the CR (triggers teardown) |
| `Note Hook` (on MergeRequest) | Parses `/diverge` slash commands on MRs (`preview`, `fix`, `extend-ttl`, `teardown`, `pause`, `resume`) |

---

## 2a. MR Slash Commands

When **Comments** (`Note Hook`) events are enabled on `/gitlab-webhook`, developers can manage preview environments and trigger autonomous `AgentTask` sandboxes directly from Merge Request notes:

| Slash Command | Action |
|---------------|--------|
| `/diverge preview` | Provisions or refreshes the `Environment` for the Merge Request (`mr-<iid>`) |
| `/diverge fix <objective>` | Spawns an autonomous `AgentTask` (`fix-mr-<iid>`) with `spec.createPreview: true` and your custom objective |
| `/diverge extend-ttl [duration]` | Extends the preview environment TTL (e.g. `/diverge extend-ttl 4h`, defaults to `24h`) |
| `/diverge teardown` | Immediately deletes the `Environment` and `PreviewGroup` (`mr-<iid>`) for the MR |
| `/diverge pause` | Suspends the active `AgentTask` (`fix-mr-<iid>`) by setting `spec.suspended: true` and revoking its Macaroon token |
| `/diverge resume` | Resumes a paused `AgentTask` (`fix-mr-<iid>`) by setting `spec.suspended: false` and minting a fresh Macaroon token |

:::caution[Collaborator Authorization]
Slash commands are restricted to authorized project members (`OWNER`, `MEMBER`, or `COLLABORATOR` roles). Untrusted external notes are rejected before any Kubernetes resources are mutated.
:::

---

## 3. GitLab CI/CD Pipeline

### Turnkey GitLab CI/CD Catalog Component (Recommended)

Diverge ships an official GitLab CI/CD Catalog Component (`$CI_SERVER_FQDN/divergedev/diverge/preview@v1`, backed by [`ci/gitlab/.gitlab-ci-component.yml`](https://github.com/divergedev/diverge/blob/main/ci/gitlab/.gitlab-ci-component.yml) and `templates/preview/template.yml`).

When `diverge_services` is left empty and `.diverge.yaml` is present in your repository, the component **automatically fetches the target branch, runs `diverge diff --base origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME --output json`**, deploys a delta `PreviewGroup` (`mr-$CI_MERGE_REQUEST_IID`) for only the modified services, and exports a `preview.env` `dotenv` report artifact to downstream E2E test jobs:

```yaml
include:
  - component: $CI_SERVER_FQDN/divergedev/diverge/preview@v1
    inputs:
      diverge_registry: "$CI_REGISTRY_IMAGE"
      diverge_base_url: "https://staging.example.com"
      diverge_ttl: "4h"

e2e_preview:
  stage: test
  needs:
    - job: diverge:preview
      optional: true
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_EVENT_TYPE != "merge_train"
  script:
    - if [ "${DIVERGE_SKIPPED:-false}" = "true" ]; then echo "No services changed; skipping E2E."; exit 0; fi
    - export EXTRA_HTTP_HEADERS="$(printf '%s' "$DIVERGE_ROUTING_HEADER_B64" | base64 -d)"
    - PREVIEW_URL="$DIVERGE_PREVIEW_URL" npx playwright test
```

:::tip[Direct File Include & Environment Cleanup]
If you are self-hosting or referencing the template directly from the repository, you can also include `ci/gitlab/.gitlab-ci-component.yml`. `diverge:preview` registers a dynamic GitLab Environment (`preview/mr-$CI_MERGE_REQUEST_IID`) wired with `on_stop: diverge:cleanup` and `auto_stop_in`, so GitLab automatically triggers `diverge:cleanup` when the Merge Request is merged, closed, or expires.
:::

#### Component Inputs

| Input | Default | Description |
| :--- | :--- | :--- |
| `diverge_services` | `""` | Comma-separated list of services to deploy (leave empty to auto-detect with `diverge diff` via `.diverge.yaml`) |
| `diverge_header_key` | `x-diverge-env` | HTTP header key used to route preview traffic |
| `diverge_ttl` | `4h` | TTL for preview environments (e.g. `4h`, `24h`) |
| `diverge_registry` | `""` | Container registry prefix for preview images (defaults to `$CI_REGISTRY_IMAGE`) |
| `diverge_namespace` | `default` | Default Kubernetes namespace for preview workloads |
| `diverge_base_url` | `""` | Optional staging/gateway URL to construct a shareable `?_diverge_env=` preview URL |
| `diverge_kubectl_version` | `v1.31.0` | Version of `kubectl` to install if not present in the runner image |

#### `preview.env` Dotenv Report Variables

The `diverge:preview` job publishes `preview.env` via `artifacts.reports.dotenv` using GitLab-compatible scalar values, making these environment variables automatically available in subsequent pipeline stages:

| Variable | Example | Description |
| :--- | :--- | :--- |
| `DIVERGE_PREVIEW_NAME` | `mr-42` | Name of the applied `PreviewGroup` resource |
| `DIVERGE_CHANGED_SERVICES_CSV` | `checkout-api,payments-worker` | Comma-separated list of changed services detected by `diverge diff` |
| `DIVERGE_SKIPPED` | `false` | `"true"` when 0 services changed and preview creation was skipped |
| `DIVERGE_HEADER_KEY` | `x-diverge-env` | HTTP routing header key |
| `DIVERGE_HEADER_VALUE` | `mr-42` | HTTP routing header value |
| `DIVERGE_ROUTING_HEADER` | `x-diverge-env: mr-42` | HTTP routing header string for `curl` / API tests |
| `DIVERGE_ROUTING_HEADER_B64` | `eyJ4LWRpdmVyZ2UtZW52IjoibXItNDIifQ==` | Base64-encoded JSON header object (`{"x-diverge-env":"mr-42"}`) for Playwright / Cypress |
| `DIVERGE_PREVIEW_URL` | `https://staging.example.com/?_diverge_env=mr-42` | Shareable zero-extension browser preview URL |

---

### Manual CLI Pipeline

If you prefer writing custom jobs instead of using the CI/CD Component, add the following to your `.gitlab-ci.yml`:

#### Pipeline Stages

```yaml
stages:
  - build
  - analyze
  - preview
  - test
  - cleanup

variables:
  REGISTRY: ${CI_REGISTRY_IMAGE}

# All jobs needing the CLI use this image (git, curl, jq included)
default:
  image: ghcr.io/divergedev/diverge-cli:v0.8.2
```

To pin a specific version, replace `v0.8.2` with the desired tag. Use `latest` to always get the newest release.

#### Change Detection

Use `diverge diff` to detect which services changed based on git diff and `.diverge.yaml` path mappings:

```yaml
analyze:
  stage: analyze
  script:
    - DIFF_JSON=$(diverge diff --output json --base "origin/${CI_MERGE_REQUEST_TARGET_BRANCH_NAME}")
    - echo "${DIFF_JSON}" | jq .
    - SERVICES=$(echo "${DIFF_JSON}" | jq -r '.services // [] | join(", ")')
    - echo "Changed services:" ${SERVICES}
    # Trace routes for each changed service
    - |
      for svc in $(echo "${DIFF_JSON}" | jq -r '.services[]?' 2>/dev/null); do
        echo "--- Route trace for ${svc} ---"
        diverge route "${svc}" || true
      done
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

#### Deploy with Sticky MR Comment

Create the preview environment and post a summary note on the Merge Request:

```yaml
preview:deploy:
  stage: preview
  script:
    - diverge create --mr "${CI_MERGE_REQUEST_IID}"
    # Post sticky MR comment using GitLab Notes API
    - |
      COMMENT_BODY="<!-- diverge-preview-comment -->
      ## 🚀 Preview Environment
      | Property | Value |
      |---|---|
      | **Environment** | \`preview-mr-${CI_MERGE_REQUEST_IID}\` |
      | **Commit** | \`${CI_COMMIT_SHORT_SHA}\` |
      | **Deploy Mode** | \`delta\` |"

      EXISTING_NOTE_ID=$(curl -s --header "PRIVATE-TOKEN: ${DIVERGE_GITLAB_TOKEN}" \
        "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes?per_page=100" \
        | jq -r '.[] | select(.body | contains("diverge-preview-comment")) | .id' | head -1)

      if [ -n "${EXISTING_NOTE_ID}" ] && [ "${EXISTING_NOTE_ID}" != "null" ]; then
        curl -s --request PUT \
          --header "PRIVATE-TOKEN: ${DIVERGE_GITLAB_TOKEN}" \
          --header "Content-Type: application/json" \
          --data "$(jq -n --arg body "${COMMENT_BODY}" '{body: $body}')" \
          "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes/${EXISTING_NOTE_ID}" > /dev/null
      else
        curl -s --request POST \
          --header "PRIVATE-TOKEN: ${DIVERGE_GITLAB_TOKEN}" \
          --header "Content-Type: application/json" \
          --data "$(jq -n --arg body "${COMMENT_BODY}" '{body: $body}')" \
          "${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes" > /dev/null
      fi
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

The `<!-- diverge-preview-comment -->` HTML marker ensures only one comment is maintained per MR — subsequent pushes update the existing note instead of creating new ones.

:::caution[Fork Merge Requests]
When accepting external contributions, restrict deployment jobs to protected branches and mark `KUBECONFIG` and `DIVERGE_GITLAB_TOKEN` as **protected variables** in CI/CD settings. This prevents fork MR pipelines from accessing cluster credentials.
:::

:::note
For MRs with many comments, the Notes API returns paginated results. Add `per_page=100` and iterate pages if the marker is not found on the first page.
:::

#### Automatic Cleanup

Tear down environments when the MR is merged or closed:

```yaml
cleanup:
  stage: cleanup
  script:
    - diverge delete "preview-mr-${CI_MERGE_REQUEST_IID}" || true
  rules:
    - if: $CI_MERGE_REQUEST_IID
      when: manual
      allow_failure: true
  environment:
    name: preview/mr-${CI_MERGE_REQUEST_IID}
    action: stop
```

:::note
Cleanup also runs automatically via the Diverge controller when it receives a merge/close webhook event — the CI job is a fallback safety net. You can use `when: manual` to avoid redundant teardowns, or `when: always` to ensure cleanup even if the webhook fails.
:::

:::tip
The full pipeline example with all stages is available at [`examples/gitlab-ci/.gitlab-ci.yml`](https://github.com/divergedev/diverge/tree/main/examples/gitlab-ci) in the Diverge repository.
:::

### CI/CD Variables Required

Configure these in **Settings → CI/CD → Variables** (provide either `KUBECONFIG` or `KUBECONFIG_CONTENT`):

| Variable | Type | Masked | Description |
|----------|------|--------|-------------|
| `KUBECONFIG` | File | No | Raw multiline kubeconfig file (GitLab `File` variables cannot be masked because they contain newlines) |
| `KUBECONFIG_CONTENT` | Variable | Yes | Single-line base64-encoded kubeconfig (`base64 -w0 ~/.kube/config`) |
| `DIVERGE_GITLAB_TOKEN` | Variable | Yes | GitLab API token with `api` scope (for custom sticky notes) |

---

## 4. Merge Gating with Commit Statuses

Diverge posts `diverge/preview` commit statuses to GitLab, enabling merge gating on preview environment health.

### Status Transitions

| Status | Meaning |
|--------|---------|
| `pending` | Environment is being provisioned |
| `running` | Deployment in progress |
| `success` | Environment is healthy and serving traffic |
| `failed` | An error occurred during provisioning |
| `canceled` | Environment was terminated |

### Requiring the Check

1. Go to **Settings → Repository → Protected branches**
2. Select your target branch (e.g., `main`)
3. Under **Status checks**, add `diverge/preview`

:::note
Commit SHAs are validated against a hex-only regex before being used in GitLab API calls, preventing path traversal attacks.
:::

---

## 5. MR Comments

Diverge automatically posts and updates Merge Request notes through the environment lifecycle:

| Event | Comment Content |
|-------|----------------|
| **Created** | Services being deployed, routing header |
| **Ready** | Preview URL, `curl` command with routing header |
| **Failed** | Error details, failed conditions, controller log hints |
| **Teardown** | Cleanup confirmation and reason |

Comments are deduplicated — Diverge tracks the `CommentID` and updates the existing note on subsequent events. If a note is deleted (404), Diverge automatically creates a new one.

### Rate Limiting

The GitLab notifier implements automatic retry with exponential backoff for HTTP 429 (rate limit) and 403 responses, respecting the `Retry-After` header.

---

## 6. Self-Hosted GitLab

For self-hosted GitLab instances:

### Controller Configuration

Pass the `--gitlab-url` flag to the controller:

```yaml
# Helm values.yaml
controller:
  extraArgs:
    - "--gitlab-url=https://gitlab.internal.example.com"
```

### Internal CA Certificates

If your instance uses self-signed certificates, mount your CA bundle:

```yaml
controller:
  extraVolumes:
    - name: ca-certs
      configMap:
        name: internal-ca-bundle
  extraVolumeMounts:
    - name: ca-certs
      mountPath: /etc/ssl/certs/internal-ca.pem
      subPath: ca.pem
```

### Network Requirements

The webhook endpoint must be reachable from your GitLab instance. For internal clusters, configure:

- **GitLab Admin Area → Settings → Network → Outbound requests**: Allow requests to the local network
- **Firewall rules**: Ensure GitLab can reach the Diverge ingress endpoint

### Private Registry Authentication

For internal container registries, configure image pull secrets:

```yaml
controller:
  imagePullSecrets:
    - name: internal-registry-credentials
```

---

## 7. GitLab CI Environment Variables

Diverge uses standard GitLab CI variables in pipeline configurations:

| Variable | Used For |
|----------|----------|
| `CI_MERGE_REQUEST_IID` | MR number for `diverge create --mr` |
| `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` | Source branch identification |
| `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` | Base branch for `diverge diff --base` |
| `CI_COMMIT_SHORT_SHA` | Container image tagging |
| `CI_MERGE_REQUEST_EVENT_TYPE` | Cleanup trigger (`merged`, `closed`) |
| `CI_PROJECT_ID` | GitLab API calls for MR comments |
| `CI_API_V4_URL` | GitLab API base URL |
| `CI_REGISTRY` / `CI_REGISTRY_IMAGE` | Container registry authentication |

---

## 8. Feature Parity

| Feature | GitHub | GitLab |
|---------|--------|--------|
| Webhook authentication | HMAC-SHA256 | Token (constant-time) |
| MR/PR comments | ✅ Sticky comments | ✅ Sticky notes |
| Interactive slash commands | ✅ `issue_comment` (`/diverge ...`) | ✅ `Note Hook` (`/diverge ...`) |
| Commit statuses | ✅ `diverge/preview` | ✅ `diverge/preview` |
| PreviewGroup support | ✅ | ✅ |
| Change detection (`diverge diff`) | ✅ | ✅ |
| Route tracing (`diverge route`) | ✅ | ✅ |
| Merge gating | ✅ Branch protection | ✅ Protected branches |
| Config fetching | ✅ Contents API | ✅ Repository Files API |
| Pipeline testing | ✅ Workflow dispatch | ✅ Pipeline trigger API |
| CLI install + caching | ✅ `setup-diverge@v1` | ✅ `diverge-cli` Docker image |
| Self-hosted support | ✅ | ✅ (`--gitlab-url`) |
| Rate limit handling | ✅ | ✅ (429/403 + Retry-After) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **No MR comments** | Verify `DIVERGE_NOTIFIER_TOKEN` has `api` scope |
| **Webhook 404** | Check webhook URL matches `/gitlab-webhook` (not `/webhook/gitlab`) |
| **Webhook auth failures** | Ensure `DIVERGE_WEBHOOK_SECRET` matches the GitLab webhook secret token |
| **Self-hosted cert errors** | Mount your internal CA bundle into the controller pod |
| **Rate limiting** | Diverge handles this automatically with exponential backoff |
| **Pipeline not triggering** | Ensure CI rules use `$CI_MERGE_REQUEST_IID` (not `$CI_PIPELINE_SOURCE`) |
