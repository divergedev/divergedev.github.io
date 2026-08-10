---
title: GitHub Integration
description: Step-by-step guide to setting up GitHub webhooks with Diverge.
---

Diverge integrates directly with GitHub to automatically trigger preview environments when pull requests are opened, updated, or closed.

## 1. Create a Webhook

Navigate to your GitHub repository or organization settings, and go to **Webhooks** -> **Add webhook**.

- **Payload URL**: Point this to your Diverge webhook endpoint, typically `https://diverge.yourdomain.com/webhook/github`
- **Content type**: Select `application/json`
- **Secret**: Generate a strong random string (e.g., `openssl rand -hex 32`) and paste it here.

### Events to Select

Select **Let me select individual events**, and check the following:
- **Pull requests** (This covers open, synchronize, and close events)

## 2. Configure Diverge

When starting the Diverge controller, you must configure the following options:

1. Enable the GitHub notifier provider by passing the flag:
   ```bash
   --notifier-provider=github
   ```

2. Provide the webhook secret you generated in step 1 to the Diverge controller (usually via an environment variable or Secret reference in your Helm chart) so Diverge can securely validate the incoming payloads using constant-time comparison.

## 3. PR Comments

Once configured, Diverge will automatically post comments on your pull requests with the preview environment URL and status updates, keeping your developers informed directly within the GitHub UI.

:::note
Diverge incorporates strict path traversal prevention and payload validation to ensure webhook processing is highly secure.
:::

## 4. Merge Gating with Commit Statuses

Diverge posts commit status checks to GitHub, enabling required status checks for pull request merging.

The `diverge/preview` status transitions through:
- **pending** → Environment is being provisioned or deploying
- **success** → Environment is healthy
- **failure** → Provisioning or deployment failed
- **error** → Environment was canceled

To enforce the check, add a **branch protection rule**:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Check **Require status checks to pass before merging**
3. Search for and add `diverge/preview`

:::note
GitHub uses slightly different state names than GitLab. Diverge automatically maps its internal states (e.g., `failed` → `failure`, `canceled` → `error`).
:::
