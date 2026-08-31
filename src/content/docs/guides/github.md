---
title: GitHub Integration
description: Complete guide to using Diverge with GitHub — webhooks, Actions workflows, PR comments, and merge gating.
---

Diverge provides first-class GitHub integration for automatic preview environments on every Pull Request. This guide covers webhook setup, GitHub Actions workflows with change detection, sticky PR comments, and merge gating.

## 1. Controller Setup

Install the Diverge controller with GitHub notifier enabled:

```bash
helm repo add diverge https://divergedev.github.io/diverge
helm repo update

helm install diverge diverge/diverge \
  --namespace diverge-system \
  --create-namespace \
  --set notifierProvider=github \
  --set controller.env.DIVERGE_NOTIFIER_TOKEN=<github-token> \
  --set controller.env.DIVERGE_WEBHOOK_SECRET=<webhook-secret>
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DIVERGE_NOTIFIER_TOKEN` | GitHub personal access token or fine-grained token with `issues:write` and `statuses:write` |
| `DIVERGE_WEBHOOK_SECRET` | Shared secret for HMAC-SHA256 webhook signature validation |

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

For PreviewGroups (multi-service), add a second webhook:

| Setting | Value |
|---------|-------|
| **Payload URL** | `https://diverge.yourdomain.com/github-previewgroup-webhook` |

:::note
GitHub webhook payloads are validated using HMAC-SHA256 signature verification (`X-Hub-Signature-256`) with constant-time comparison.
:::

### Webhook Events Handled

| PR Action | Diverge Behavior |
|-----------|-----------------|
| `opened`, `reopened` | Creates `Environment` / `PreviewGroup` CR |
| `synchronize` (new push) | Updates the CR with new commit SHA |
| `closed` | Deletes the CR (triggers teardown) |

---

## 3. GitHub Actions Workflow

Diverge provides a complete GitHub Actions workflow for automated preview environments. Add this to `.github/workflows/diverge-preview.yml`:

### Pipeline Overview

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
```

### Change Detection

Use `diverge diff` to detect which services changed based on git diff and `.diverge.yaml` path mappings:

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

### Route Tracing

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

### Deploy with Sticky PR Comment

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

### Automatic Cleanup

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

The [`divergedev/setup-diverge`](https://github.com/divergedev/setup-diverge) action handles CLI installation and caching automatically:

```yaml
- uses: divergedev/setup-diverge@v1
```

To pin a specific version:

```yaml
- uses: divergedev/setup-diverge@v1
  with:
    version: '0.8.2'
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
