---
title: GitLab Integration
description: Step-by-step guide to setting up GitLab webhooks with Diverge.
---

Diverge integrates securely with GitLab to automatically spin up preview environments when Merge Requests are created, updated, or merged.

## 1. Create a Webhook

Navigate to your GitLab repository (or group) -> **Settings** -> **Webhooks**.

- **URL**: Point this to your Diverge webhook endpoint, typically `https://diverge.yourdomain.com/webhook/gitlab`
- **Secret token**: Generate a secure token (e.g., `openssl rand -hex 32`) and input it here. GitLab will send this token in the `X-Gitlab-Token` header.

### Triggers to Select

Check the following trigger:
- **Merge request events**

## 2. Configure Diverge

When deploying the Diverge controller, configure it to handle GitLab events:

1. Enable the GitLab notifier provider flag:
   ```bash
   --notifier-provider=gitlab
   ```

2. Configure the webhook secret token in the Diverge controller to ensure secure, constant-time validation of the `X-Gitlab-Token` header.

## 3. MR Comments

With the integration active, Diverge will automatically comment on your Merge Requests, providing a direct URL to the preview environment and posting status updates as the deployment progresses.

:::tip
Diverge implements path traversal prevention on all webhook parsing for enhanced security.
:::

## 4. Merge Gating with Commit Statuses

Diverge can post commit status checks to GitLab, allowing you to gate merges on preview environment health.

When enabled, Diverge posts a `diverge/preview` commit status that transitions through:
- **pending** → Environment is being provisioned
- **running** → Deployment in progress
- **success** → Environment is healthy and serving traffic
- **failed** → An error occurred during provisioning
- **canceled** → Environment was terminated

To require the status check before merging, configure a **protected branch rule** in GitLab:

1. Go to **Settings** → **Repository** → **Protected branches**
2. Select your target branch (e.g., `main`)
3. Under **Status checks**, add `diverge/preview`

:::note
Commit SHAs are validated against a hex-only regex before being used in GitLab API calls, preventing path traversal attacks.
:::
