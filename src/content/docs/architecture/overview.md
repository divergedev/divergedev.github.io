---
title: Architecture Overview
description: Overview of Diverge architecture
---

Diverge uses a single consolidated Docker image containing both the controller and the proxy.

- **Controller**: Manages the lifecycle of preview environments. It directly creates Argo CD `Application` CRs via Server-Side Apply per changed service.
- **Proxy**: Handles traffic and cross-origin policies.
