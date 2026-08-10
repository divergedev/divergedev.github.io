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
