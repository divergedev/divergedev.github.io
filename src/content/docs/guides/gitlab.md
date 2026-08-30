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
| **Trigger** | ✅ Merge request events |

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

| MR Action | Diverge Behavior |
|-----------|-----------------|
| `open`, `reopen` | Creates `Environment` / `PreviewGroup` CR |
| `update` (new push) | Updates the CR with new commit SHA |
| `merge`, `close` | Deletes the CR (triggers teardown) |

---

## 3. GitLab CI/CD Pipeline

Diverge provides a complete CI pipeline example that mirrors the GitHub Actions workflow. Add this to your `.gitlab-ci.yml`:

### Pipeline Stages

```yaml
stages:
  - build
  - analyze
  - preview
  - test
  - cleanup

variables:
  DIVERGE_VERSION: "0.8.1"
  REGISTRY: ${CI_REGISTRY_IMAGE}
```

### Change Detection

Use `diverge diff` to detect which services changed based on git diff and `.diverge.yaml` path mappings:

```yaml
analyze:
  stage: analyze
  image: alpine:latest
  before_script:
    - apk add --no-cache curl tar jq
    - curl -sSL "https://github.com/divergedev/diverge/releases/download/v${DIVERGE_VERSION}/diverge_${DIVERGE_VERSION}_linux_amd64.tar.gz" | tar xz -C /usr/local/bin diverge
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

### Deploy with Sticky MR Comment

Create the preview environment and post a summary note on the Merge Request:

```yaml
preview:deploy:
  stage: preview
  image: alpine:latest
  before_script:
    - apk add --no-cache curl tar jq
    - curl -sSL "https://github.com/divergedev/diverge/releases/download/v${DIVERGE_VERSION}/diverge_${DIVERGE_VERSION}_linux_amd64.tar.gz" | tar xz -C /usr/local/bin diverge
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

### Automatic Cleanup

Tear down environments when the MR is merged or closed:

```yaml
cleanup:
  stage: cleanup
  image: alpine:latest
  before_script:
    - apk add --no-cache curl tar
    - curl -sSL "https://github.com/divergedev/diverge/releases/download/v${DIVERGE_VERSION}/diverge_${DIVERGE_VERSION}_linux_amd64.tar.gz" | tar xz -C /usr/local/bin diverge
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

Configure these in **Settings → CI/CD → Variables**:

| Variable | Type | Masked | Description |
|----------|------|--------|-------------|
| `KUBECONFIG` | File | No | Kubernetes cluster credentials |
| `DIVERGE_GITLAB_TOKEN` | Variable | Yes | GitLab API token with `api` scope |

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
| Commit statuses | ✅ `diverge/preview` | ✅ `diverge/preview` |
| PreviewGroup support | ✅ | ✅ |
| Change detection (`diverge diff`) | ✅ | ✅ |
| Route tracing (`diverge route`) | ✅ | ✅ |
| Merge gating | ✅ Branch protection | ✅ Protected branches |
| Config fetching | ✅ Contents API | ✅ Repository Files API |
| Pipeline testing | ✅ Workflow dispatch | ✅ Pipeline trigger API |
| CLI install + caching | ✅ `setup-diverge@v1` | `curl` + `tar` |
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
