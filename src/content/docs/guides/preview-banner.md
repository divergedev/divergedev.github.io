---
title: Preview Banner
description: Inject a visual banner into preview environment pages
---

Diverge can automatically inject a visual banner into your web applications to clearly indicate when you are viewing a preview environment.

## How it works

The Diverge proxy intercepts HTML responses and injects a customizable snippet just before the closing `</body>` tag.

## Configuration

Enable the banner in your `Environment` CRD:

```yaml
spec:
  banner:
    enabled: true
    position: bottom-right
```

## Customization

You can customize the CSS and text of the banner to match your application's branding.
