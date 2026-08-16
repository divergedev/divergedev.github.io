---
title: DevSpace Integration
description: Use DevSpace with Diverge for in-cluster file sync and hot reload
---

Diverge integrates seamlessly with DevSpace for in-cluster file sync and hot reload workflows.

## The Nested Command Pattern

Use `diverge dev -- devspace dev` to run DevSpace within a Diverge preview environment. Diverge will set up the routing and inject the environment variables, then DevSpace will handle the in-cluster synchronization.

## `devspace.yaml` Template

You can generate a starter DevSpace configuration:

```bash
diverge dev --devspace
```

## When to use DevSpace vs Local

- **Local Hot-Reload**: Best for fast iteration, low resource usage, and standard setups.
- **DevSpace**: Best for heavy dependencies, mimicking production exactly, or when local compute is limited.
