---
title: Preview Banner
description: Inject a visual banner into preview environment pages
---

Diverge can automatically inject a visual banner into your web applications to clearly indicate when you are viewing a preview environment.

## How It Works

The Diverge proxy intercepts HTML responses and injects a lightweight, non-intrusive preview banner just before the closing `</body>` tag. The banner provides immediate visual feedback that traffic is being routed to an ephemeral preview environment rather than production.

## Configuration in `diverge.yaml`

Starting in Diverge `v0.10.0`, you can configure the preview banner globally in your repository's `diverge.yaml`:

```yaml
# diverge.yaml
defaults:
  routing:
    banner:
      enabled: true          # Set to false to hide the banner
      text: "PR Preview"     # Custom banner label
      position: bottom       # "top" or "bottom"
      color: "#6366F1"       # Hex color code for banner accent
```

### Environment & Label Overrides

Banner settings support hierarchical inheritance. You can enable the banner by default for feature branches while hiding or restyling it for specific environments:

```yaml
# diverge.yaml
defaults:
  routing:
    banner:
      enabled: true
      position: bottom
      color: "#3B82F6"

environments:
  # Hide banner for staging previews
  staging:
    routing:
      banner:
        enabled: false

  # High-priority hotfix previews with distinct warning color
  hotfix:
    routing:
      banner:
        enabled: true
        text: "⚠️ HOTFIX PREVIEW"
        position: top
        color: "#EF4444"
```

## CRD Configuration

You can also specify or override banner settings directly on the `Environment` custom resource:

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-42
spec:
  routing:
    banner:
      enabled: true
      text: "Review Env #42"
      position: bottom
      color: "#10B981"
```

## Disabling the Banner

If your end-to-end tests or visual regression pipelines require pixel-perfect screenshots without injected markup, disable the banner globally in `diverge.yaml`:

```yaml
defaults:
  routing:
    banner:
      enabled: false
```

---

## In-Browser Floating DevToolbar (`<diverge-toolbar>`)

When traffic is routed through `diverge-proxy`, Diverge automatically injects a collapsible, Shadow DOM-isolated floating toolbar (`<script src="/-/toolbar.js" defer></script>`) before `</body>` on `text/html` responses:

- **Active Environment Pill**: Displays the currently active preview environment (`diverge_env` cookie, subdomain, or header) or `baseline`.
- **Environment Switcher Dropdown**: Populated dynamically from `GET /-/api/context`, allowing 1-click switching between any active preview environment in the cluster.
- **Copy Magic Link (`?_diverge_env=<env>`)**: Copies a shareable URL that sets the `diverge_env` cookie automatically for PMs, designers, or QA reviewers.
- **Reset to Baseline**: Navigates to `?_diverge_env=clear` (or `?_diverge_env=reset`) to expire the preview cookie and return to baseline traffic.

To skip `<diverge-toolbar>` injection on a specific request (for example during automated screenshot capture), pass the `X-Diverge-Toolbar: off` request header.
