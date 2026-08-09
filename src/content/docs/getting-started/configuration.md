---
title: Configuration
description: Configure Diverge
---

Diverge is configured using Helm. The Helm chart now includes both the proxy Deployment and Service, which are conditional on `proxy.enabled`. The proxy component has its own dedicated values section for specific configurations.
