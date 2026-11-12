---
title: GitHub Integration
description: Complete guide to using Diverge with GitHub — webhooks, Actions workflows, PR comments, and merge gating.
---

Diverge provides first-class GitHub integration for automatic preview environments on every Pull Request. This guide covers webhook setup, GitHub Actions workflows with change detection, sticky PR comments, and merge gating.

## 1. Controller Setup

Create the controller and preview namespaces, store your GitHub API token and webhook shared secret as Kubernetes Secrets, and install the Diverge `0.24.0` Helm chart:

```bash
kubectl create namespace diverge-system
kubectl create namespace diverge-previews

kubectl -n diverge-system create secret generic diverge-github \
  --from-literal=token=<github-token>
kubectl -n diverge-system create secret generic diverge-webhook-token \
  --from-literal=token=<webhook-secret>

helm install diverge oci://ghcr.io/divergedev/charts/diverge \
  --version 0.24.0 \
  --namespace diverge-system \
  --set notifier.provider=github \
  --set notifier.tokenSecretRef.name=diverge-github \
  --set webhook.secretName=diverge-webhook-token \
  --set defaultNamespace=diverge-previews
```

:::tip[Custom Controller Flags & GitHub Enterprise (`v0.24.0+`)]
The `0.24.0` Helm chart natively wires the notifier Secret, GitHub Enterprise API URL, and custom controller flags/env vars without manual `kubectl set env` patching:
- `notifier.provider=github`, `notifier.tokenSecretRef.name=diverge-github`, and `notifier.tokenSecretRef.key=token`
- `notifier.baseUrl=https://ghe.example.com/api/v3` (sets `DIVERGE_NOTIFIER_BASE_URL` without altering the application replay baseline)
- `extraArgs` (controller CLI flags) and `extraEnv` (a list of `EnvVar` entries)
:::

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DIVERGE_NOTIFIER_TOKEN` | GitHub personal access token or fine-grained token with `issues:write` and `statuses:write` |
| `DIVERGE_WEBHOOK_SECRET` | Shared secret for HMAC-SHA256 webhook signature validation (mounted from `webhook.secretName`, key `token`) |

---

## 2. Webhook Configuration

Navigate to your GitHub repository or organization: **Settings → Webhooks → Add webhook**.

| Setting | Value |
|---------|-------|
| **Payload URL** | `https://diverge.yourdomain.com/github-webhook` |
| **Content type** | `application/json` |
| **Secret** | Your `DIVERGE_WEBHOOK_SECRET` value |

### Events to Select

Select **Let me select individual events**, and check:
- ✅ **Pull requests** (covers `opened`, `synchronize`, `reopened`, `closed`)
- ✅ **Issue comments** (`issue_comment` — required for interactive `/diverge` slash commands on Pull Requests)

For PreviewGroups (multi-service), add a second webhook:

| Setting | Value |
|---------|-------|
| **Payload URL** | `https://diverge.yourdomain.com/github-previewgroup-webhook` |

:::note
GitHub webhook payloads are validated using HMAC-SHA256 signature verification (`X-Hub-Signature-256`) with constant-time comparison.
:::

:::tip[Organization-Level Webhooks & Opt-In Repositories (`v0.24.0+`)]
Starting in `v0.24.0+`, when `deploy.provider: direct` and `deploy.manifestSourceType: serviceconfig` are enabled, Diverge automatically skips Pull Request events from repositories that do not have a `.diverge.yaml` (`kind: ServicePreview`) on the PR head branch, removes any existing preview if a subsequent commit deletes `.diverge.yaml`, and honors `spec.image.repository` (e.g. `ghcr.io/org/service`, without a tag or digest). In `v0.23.0` and earlier, only register webhooks on repositories that participate in Diverge previews — `v0.23.0` constructs the preview image from `<owner>/<repo>:<sha>` and creates an unconfigured `Environment` when `.diverge.yaml` is absent.
:::

### Webhook Events Handled

| Event / Action | Diverge Behavior |
|----------------|-----------------|
| `pull_request`: `opened`, `reopened` | Creates `Environment` / `PreviewGroup` CR |
| `pull_request`: `synchronize` (new push) | Updates the CR with new commit SHA |
| `pull_request`: `closed` | Deletes the CR (triggers teardown) |
| `issue_comment`: `created` | Parses `/diverge` slash commands on PRs (`preview`, `verify`, `replay`, `fix`, `guide`, `budget`, `status`, `help`, `extend-ttl`, `teardown`, `pause`, `resume`) |

---

## 2a. PR Slash Commands

When `Issue comments` (`issue_comment`) events are delivered to `/github-webhook`, authorized contributors can control preview environments and dispatch autonomous `AgentTask` sandboxes directly from Pull Request comments:

| Slash Command | Action |
|---------------|--------|
| `/diverge preview` | Provisions or refreshes the `Environment` for the Pull Request (`pr-<number>`) |
| `/diverge verify [path] [--fix]` | Runs Kubernetes workload `doctor` diagnostics and routed HTTP readiness + baseline parity probes against the PR preview environment (defaults to `/`) and posts a Markdown scorecard; pass `--fix` (or `--auto-fix`) to spawn/steer a self-healing `AgentTask` on failure |
| `/diverge replay [path ...] [--fix]` | Replays inline whitespace-separated `GET` probe paths against baseline and the PR preview environment (defaults to `/`), diffing status codes, latency, and JSON/Protobuf response contracts (supporting header-routed and subdomain-routed previews when a baseline URL is configured via `spec.routing.externalUrl`); pass `--fix` (or `--auto-fix`) to spawn/steer a self-healing `AgentTask` on failure |
| `/diverge fix <objective>` | Spawns an autonomous `AgentTask` (`fix-pr-<number>`) with `divergedev.com/preview-enabled: "true"` and your custom objective (defaults to fixing PR issues) |
| `/diverge guide <hint>` | Sends live steering guidance (`divergedev.com/guidance`) delivered to the active agent on its next metering heartbeat |
| `/diverge budget [+$budget] [tokens]` | Bumps the active `AgentTask`'s USD and/or token budget without changing suspension state |
| `/diverge status` | Posts an immediate Markdown summary of active `AgentTask`s and linked preview environments |
| `/diverge help` | Displays the interactive slash command reference table |
| `/diverge extend-ttl [duration]` | Extends the preview environment TTL (e.g. `/diverge extend-ttl 4h`, defaults to `24h`) |
| `/diverge teardown` | Immediately deletes the `Environment` (`pr-<number>`) and `PreviewGroup` (`mr-<number>`) for the PR |
| `/diverge pause` | Suspends the active `AgentTask` (`fix-pr-<number>`) by setting `spec.suspended: true`, revoking its Macaroon token, and hibernating its linked preview |
| `/diverge resume [+$budget] [tokens]` | Resumes a paused `AgentTask` (`fix-pr-<number>`) by setting `spec.suspended: false`, optionally bumping budget, and minting a fresh Macaroon token |

:::caution[Collaborator Authorization]
For security, Diverge verifies the commenter's `author_association` before executing any slash command. Only users with `OWNER`, `MEMBER`, or `COLLABORATOR` association on the repository are permitted to run `/diverge` commands; comments from untrusted external users on public repositories are ignored.
:::

---

## 3. GitHub Actions Workflow

### Turnkey Composite Action (`divergedev/diverge@v0.24.0` — Recommended)

Use the official `divergedev/diverge@v0.24.0` composite GitHub Action (defined in the root [`action.yml`](https://github.com/divergedev/diverge/blob/main/action.yml) of `divergedev/diverge`) to validate `.diverge.yaml`, run `diverge diff`, deploy a delta `PreviewGroup` for only modified microservices, run `diverge verify` SLO/baseline checks, replay recorded `.jsonl` / `.har` traffic traces (including stateful `extract` / `{{var}}` multi-step flows and `--auto-fix` self-healing), and pass routing headers directly into Playwright or Cypress E2E tests:

:::caution[Sanitize Replay Traces Before Committing to Git]
Scrub recorded `.jsonl` / `.har` traces with `diverge record` (plus `--redact-body-field`) or `diverge replay sanitize` **before committing them to the repository**. Runtime CI inputs (`replay-strip-auth: "true"`, `replay-redact-query`, `replay-redact-body-fields`) provide an additional safeguard during replay rather than a substitute for pre-commit sanitization.
:::

```yaml
name: Diverge Preview Environment

on:
  pull_request:
    types: [opened, synchronize, reopened, closed]

concurrency:
  group: diverge-preview-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write

jobs:
  preview:
    if: github.event.action != 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Deploy Diverge Delta Preview
        id: diverge
        uses: divergedev/diverge@v0.24.0
        with:
          action: deploy
          kubeconfig: ${{ secrets.PREVIEW_KUBECONFIG }}
          image-registry: ghcr.io/acme
          base-url: https://staging.example.com
          wait: "true"
          verify: "true"
          verify-path: "/healthz"
          verify-compare-baseline: "true"
          verify-max-latency: "500ms"

      - name: Install Playwright Dependencies
        if: steps.diverge.outputs.skipped != 'true'
        run: |
          npm ci
          npx playwright install --with-deps chromium

      - name: Run Playwright E2E Against Preview
        if: steps.diverge.outputs.skipped != 'true'
        run: npx playwright test
        env:
          PREVIEW_URL: ${{ steps.diverge.outputs.preview-url }}
          EXTRA_HTTP_HEADERS: ${{ steps.diverge.outputs.routing-header-json }}

  cleanup:
    name: Teardown Preview Environment
    if: github.event.action == 'closed' && github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: divergedev/diverge@v0.24.0
        with:
          action: teardown
          kubeconfig: ${{ secrets.PREVIEW_KUBECONFIG }}
```

In your `playwright.config.ts`, read `PREVIEW_URL` and `EXTRA_HTTP_HEADERS` so every browser request carries the preview routing header:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: process.env.PREVIEW_URL || 'https://staging.example.com',
    extraHTTPHeaders: process.env.EXTRA_HTTP_HEADERS
      ? JSON.parse(process.env.EXTRA_HTTP_HEADERS)
      : undefined,
  },
});
```

#### `divergedev/diverge@v0.24.0` Inputs

| Input | Default | Description |
| :--- | :--- | :--- |
| `action` | `deploy` | Action to execute: `validate`, `diff`, `deploy`, `verify`, `replay`, or `teardown` |
| `version` | `latest` | Diverge CLI version to install (or `installed` to use pre-installed binary) |
| `config` | `.diverge.yaml` | Path to `.diverge.yaml` configuration file |
| `kubeconfig` | `""` | Raw or base64-encoded kubeconfig for the target Kubernetes cluster |
| `namespace` | `default` | Default Kubernetes namespace for preview resources |
| `preview-name` | `""` | Explicit `PreviewGroup` name override (defaults to `pr-<number>` or branch slug) |
| `base-ref` | `origin/<base_ref>` | Git base reference for `diverge diff` |
| `branch` | `""` | Source branch name override |
| `pr-number` | `""` | Pull request number override |
| `services` | `""` | Explicit comma- or newline-separated service specs (overrides `diverge diff`) |
| `image-registry` | `""` | Container registry prefix for changed service images (e.g. `ghcr.io/acme`) |
| `image-tag` | `""` | Image tag for changed services (defaults to resolved `preview-name`) |
| `header-key` | `x-diverge-env` | HTTP routing header key |
| `header-value` | `<preview-name>` | HTTP routing header value |
| `ttl` | `4h` | Preview environment time-to-live duration (e.g. `4h`, `24h`) |
| `base-url` | `""` | Optional staging/gateway base URL to construct a shareable `?_diverge_env=` preview URL |
| `wait` | `false` | Wait for `PreviewGroup` `Ready` condition before completing |
| `wait-timeout` | `180s` | Timeout when waiting for `PreviewGroup` readiness |
| `verify` | `false` | Run `diverge verify` after deployment to validate workload health, HTTP readiness, and latency SLOs |
| `verify-path` | `/` | HTTP path to probe when `verify` is `"true"` |
| `verify-compare-baseline` | `false` | Compare preview HTTP status against unrouted baseline when `verify` is `"true"` |
| `verify-max-latency` | `5s` | Maximum allowed preview response latency when `verify` is `"true"` (e.g. `500ms`, `2s`) |
| `replay` | `false` | Run `diverge replay` after deployment (`"true"` / `"false"`) |
| `replay-from` | `""` | Path to HAR (`.har`) or JSONL (`.jsonl`) trace file for `diverge replay` |
| `replay-max-latency` | `""` | Maximum allowed preview latency per replayed request (e.g. `500ms`, `2s`) |
| `replay-compare-values` | `false` | Compare exact scalar values during replay instead of structural types |
| `replay-fail-on-extra-fields` | `false` | Fail replay when preview adds new fields not present in baseline |
| `replay-ignore-fields` | `""` | Comma-separated field paths or Protobuf field numbers to ignore during replay |
| `replay-filter-hosts` | `""` | Comma-separated host patterns to include from HAR/JSONL traces during replay |
| `replay-strip-auth` | `false` | Strip recorded `Authorization`, `Cookie`, and `X-Api-Key` headers and auth query tokens before replay |
| `replay-redact-query` | `""` | Comma-separated query parameter names to redact with `[REDACTED]` before replay |
| `replay-redact-body-fields` | `""` | Comma-separated JSON request body field names or dot-paths to redact before replay |
| `replay-proto-descriptor` | `""` | Optional compiled Protobuf `FileDescriptorSet` (`.pb`/`.desc`) for named-field Protobuf diffs |
| `replay-proto-message` | `""` | Fully-qualified Protobuf response message name when using `replay-proto-descriptor` |
| `auto-fix` | `false` | Automatically create or update a self-healing `AgentTask` when `verify` or `replay` fails |
| `dry-run` | `false` | Render `PreviewGroup` manifest without applying to Kubernetes |

#### `divergedev/diverge@v0.24.0` Outputs

| Output | Example | Description |
| :--- | :--- | :--- |
| `preview-name` | `pr-42` | Resolved `PreviewGroup` name |
| `changed-services` | `["checkout-api"]` | JSON array of changed service names from `diverge diff` |
| `changed-count` | `1` | Number of changed services detected |
| `skipped` | `false` | `"true"` when deployment was skipped because 0 services changed |
| `routing-header` | `x-diverge-env: pr-42` | HTTP routing header string for `curl` or API tests |
| `routing-header-json` | `{"x-diverge-env":"pr-42"}` | JSON object of the routing header for Playwright `extraHTTPHeaders` or Cypress |
| `preview-url` | `https://staging.example.com/?_diverge_env=pr-42` | Shareable zero-extension preview URL with `?_diverge_env=` query parameter |

---

### Manual CLI Workflow

If you prefer calling the `diverge` CLI steps directly in `.github/workflows/diverge-preview.yml`:

#### Change Detection (`diverge diff`)

Use `diverge diff` to detect which services changed based on git diff and `.diverge.yaml` path mappings (using `.services` in the JSON output):

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Full history required for accurate diffing

- name: Install Diverge CLI
  uses: divergedev/setup-diverge@v1

- name: Detect changed services
  id: diff
  run: |
    DIFF_JSON=$(diverge diff --output json --base origin/main)
    SERVICES=$(echo "$DIFF_JSON" | jq -r '.services // [] | join(", ")')
    COUNT=$(echo "$DIFF_JSON" | jq -r '.count // 0')
    echo "changed_services=${SERVICES}" >> $GITHUB_OUTPUT
    echo "changed_count=${COUNT}" >> $GITHUB_OUTPUT
```

#### Route Tracing

Trace the ingress path for each changed service to understand request routing:

```yaml
- name: Trace request routes
  id: routes
  run: |
    IFS=', ' read -ra SERVICES <<< "${{ steps.diff.outputs.changed_services }}"
    for svc in "${SERVICES[@]}"; do
      echo "::group::Route trace for $svc"
      diverge route "$svc"
      echo "::endgroup::"
    done
```

#### Deploy with Sticky PR Comment

Create the preview environment and post a summary comment on the PR:

```yaml
- name: Deploy preview environment
  id: deploy
  env:
    PR_NUMBER: ${{ github.event.pull_request.number }}
  run: |
    ENV_NAME="preview-mr-${PR_NUMBER}"
    DEPLOY_OUTPUT=$(diverge create --mr "${PR_NUMBER}")
    echo "$DEPLOY_OUTPUT"

    PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^ ]*' | head -n 1)
    if [ -z "$PREVIEW_URL" ]; then
      PREVIEW_URL="https://${ENV_NAME}.preview.example.com"
    fi

    echo "env_name=${ENV_NAME}" >> $GITHUB_OUTPUT
    echo "preview_url=${PREVIEW_URL}" >> $GITHUB_OUTPUT

- name: Comment Preview URL on PR
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const commentIdentifier = '<!-- diverge-preview-comment -->';
      const body = `${commentIdentifier}
      ## 🚀 Diverge Preview Environment

      | Property | Value |
      |---|---|
      | **Environment** | \`${{ steps.deploy.outputs.env_name }}\` |
      | **Preview URL** | [${{ steps.deploy.outputs.preview_url }}](${{ steps.deploy.outputs.preview_url }}) |
      | **Changed Services** | \`${{ steps.diff.outputs.changed_services }}\` |
      | **Deploy Mode** | \`delta\` |

      *Updated for commit \`${context.sha.substring(0, 7)}\`.*`;

      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
      });

      const existing = comments.find(c => c.body?.includes(commentIdentifier));
      if (existing) {
        await github.rest.issues.updateComment({
          ...context.repo, comment_id: existing.id, body,
        });
      } else {
        await github.rest.issues.createComment({
          ...context.repo, issue_number: context.issue.number, body,
        });
      }
```

The `<!-- diverge-preview-comment -->` HTML marker ensures only one comment is maintained per PR — subsequent pushes update the existing comment.

:::caution[Fork Pull Requests]
This workflow uses `pull_request` which does not grant write access for fork PRs. For repositories accepting external contributions, consider using a separate trusted workflow triggered by `workflow_run` to post comments, avoiding the security risks of `pull_request_target` with untrusted checkout code.
:::

:::note
For PRs with many comments, use `github.paginate` instead of `listComments` to ensure the marker is found beyond the first page of results.
:::

#### Automatic Cleanup

Tear down environments when the PR is closed or merged:

```yaml
cleanup:
  name: Teardown Preview Environment
  if: github.event.action == 'closed'
  runs-on: ubuntu-latest
  steps:
    - uses: divergedev/setup-diverge@v1
    - name: Delete preview environment
      run: |
        diverge delete "preview-mr-${{ github.event.pull_request.number }}" || true
```

:::tip
The full workflow is available at [`examples/github-actions/diverge-preview.yml`](https://github.com/divergedev/diverge/tree/main/examples/github-actions) in the Diverge repository.
:::

### The `setup-diverge` Action

The [`divergedev/setup-diverge`](https://github.com/divergedev/setup-diverge) action handles standalone CLI installation and caching automatically:

```yaml
- uses: divergedev/setup-diverge@v1
```

To pin a specific version:

```yaml
- uses: divergedev/setup-diverge@v1
  with:
    version: '0.24.0'
```

It resolves the latest release via GitHub API, caches the binary per OS/arch/version using `actions/cache`, and adds `diverge` to `PATH`.

---

## 4. Merge Gating with Commit Statuses

Diverge posts `diverge/preview` commit statuses to GitHub, enabling required status checks.

### Status Transitions

| Status | Meaning |
|--------|---------|
| `pending` | Environment is being provisioned |
| `success` | Environment is healthy and serving traffic |
| `failure` | An error occurred during provisioning |
| `error` | Environment was canceled |

:::note
GitHub uses slightly different state names than GitLab. Diverge automatically maps its internal states (e.g., `failed` → `failure`, `canceled` → `error`).
:::

### Requiring the Check

1. Go to **Settings → Branches → Branch protection rules**
2. Check **Require status checks to pass before merging**
3. Search for and add `diverge/preview`

---

## 5. PR Comments

Diverge automatically posts and updates Pull Request comments through the environment lifecycle:

| Event | Comment Content |
|-------|----------------|
| **Created** | Services being deployed, routing header |
| **Ready** | Preview URL, `curl` command with routing header |
| **Failed** | Error details, failed conditions, controller log hints |
| **Teardown** | Cleanup confirmation and reason |

Comments are deduplicated — Diverge tracks the comment ID and updates the existing comment on subsequent events.

---

## 6. GitHub Actions Environment Variables

Standard GitHub Actions variables used in Diverge workflows:

| Variable | Used For |
|----------|----------|
| `github.event.pull_request.number` | PR number for `diverge create --mr` |
| `github.head_ref` | Source branch for concurrency grouping |
| `github.event.action` | Cleanup trigger (`closed`) |
| `context.sha` | Commit hash for comment updates |
| `secrets.KUBECONFIG` | Kubernetes cluster credentials |
| `secrets.GITHUB_TOKEN` | PR comment posting (auto-provided) |

---

## 7. Feature Parity

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
| CLI install + caching | ✅ `setup-diverge@v1` | ✅ `diverge-cli` Docker image |
| Self-hosted support | ✅ | ✅ (`--gitlab-url`) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **No PR comments** | Verify workflow has `pull-requests: write` permission |
| **Webhook 404** | Check payload URL matches `/github-webhook` |
| **Webhook signature failures** | Ensure `DIVERGE_WEBHOOK_SECRET` matches the GitHub webhook secret |
| **Status checks not appearing** | Verify `DIVERGE_NOTIFIER_TOKEN` has `statuses:write` scope |
| **Stale PR comments** | Check the `<!-- diverge-preview-comment -->` marker is present |
