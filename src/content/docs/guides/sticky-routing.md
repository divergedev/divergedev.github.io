---
title: Sticky Routing & Floating DevToolbar
description: Route browser sessions to preview environments without custom HTTP headers using Magic Links (?_diverge_env=), sticky cookies, and the in-browser floating DevToolbar.
---

Header-based L7 routing (`x-diverge-env: pr-42`) is ideal for service-to-service calls and automated Playwright E2E suites, but non-technical reviewers (PMs, designers, QA) cannot easily inject custom HTTP headers in a standard browser or mobile device.

Diverge solves this with **Sticky Cookie Routing (`diverge_env`)**, **One-Click Magic Links (`?_diverge_env=<env>`)**, and an **In-Browser Floating DevToolbar (`<diverge-toolbar>`)** built directly into `diverge-proxy`.

---

## 1. One-Click Magic Links (`?_diverge_env=<env>`)

Append `?_diverge_env=<env>` to any URL served by `diverge-proxy` (or visit `/-/select?env=<env>`):

```text
https://preview.example.com/?_diverge_env=pr-42
```

When a browser requests this URL, `diverge-proxy`:
1. Validates the environment identifier against DNS-1123 rules (`[a-z0-9-]`, max 63 chars).
2. Sets an `HttpOnly`, `SameSite=Lax` sticky cookie (`Set-Cookie: diverge_env=pr-42; Path=/; Max-Age=86400`).
3. Redirects (`302 Found`) to the clean URL (`https://preview.example.com/`) with `_diverge_env` stripped from the query string.
4. Automatically injects `x-diverge-env: pr-42` on all subsequent HTML, XHR/fetch, and asset requests from that browser session.

### Opening a Magic Link from the CLI

Use `diverge open --magic` to launch (or print) the Magic Link for any `Environment` or `PreviewGroup`:

```bash
# Open the Magic Link in your default browser
diverge open pr-42 --magic

# Print the Magic Link without opening a browser
diverge open pr-42 --magic --no-browser
```

---

## 2. Resetting to Baseline (`?_diverge_env=clear` / `reset`)

To exit a preview environment and return to baseline traffic, visit either:

```text
https://preview.example.com/?_diverge_env=clear
https://preview.example.com/?_diverge_env=reset
```

`diverge-proxy` immediately expires the `diverge_env` cookie (`Max-Age=-1`) and redirects back to the clean path.

---

## 3. Environment Resolution Precedence

On every incoming request, `diverge-proxy` resolves the target preview environment in the following order:

1. **Subdomain**: `<env>.<preview-domain>` (e.g., `pr-42.preview.example.com` $\rightarrow$ `pr-42`)
2. **Sticky Cookie**: `Cookie: diverge_env=pr-42` (on the apex preview domain `preview.example.com`)
3. **HTTP Header**: `x-diverge-env: pr-42` (or custom configured `--header-key`)

---

## 4. In-Browser Floating DevToolbar (`<diverge-toolbar>`)

When `diverge-proxy` serves an HTML response (`Content-Type: text/html`), it automatically injects `<script src="/-/toolbar.js" defer></script>` right before `</body>`.

The script mounts a zero-dependency **Shadow DOM Web Component (`<diverge-toolbar>`)** in the bottom-right corner of the viewport that queries `GET /-/api/context` and provides:

- **Active Environment Indicator**: Shows which preview environment is currently active (or `baseline`).
- **Live Environment Switcher**: Dropdown populated with all active preview environments in the cluster for 1-click switching.
- **Copy Magic Link**: Copies the shareable `?_diverge_env=<active>` URL to the clipboard.
- **Reset to Baseline**: Clears the `diverge_env` cookie in one click.

### Opting Out of Toolbar Injection (`X-Diverge-Toolbar: off`)

For automated visual regression tests or scrapers that require unmodified HTML responses, send `X-Diverge-Toolbar: off`:

```bash
curl -H "X-Diverge-Toolbar: off" https://preview.example.com/
```

---

## 5. CLI Request Testing (`diverge curl`)

To test preview routing from your terminal without opening a browser, use `diverge curl`:

```bash
# Send a GET request with automatic x-diverge-env and W3C baggage headers
diverge curl pr-42 /api/checkout

# Compare the preview response and latency side-by-side against baseline
diverge curl pr-42 /api/checkout --compare-baseline
```
