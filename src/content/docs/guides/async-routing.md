---
title: Async Routing
description: Route Kafka, Temporal, and other async workloads to preview environments
---

Diverge supports routing asynchronous workloads like Kafka messages, Temporal workflows, and RabbitMQ events to preview environments.

## Overview

Unlike HTTP, async workloads don't have standard headers for routing. Diverge provisions dedicated topics/queues for preview environments and injects these configurations as environment variables.

## Provisioning Async Routes

When you run `diverge dev` or create a preview environment, Diverge provisions the necessary async routes based on your configuration.

The `AsyncRoutingReady` condition on the `Environment` CRD tracks the provisioning status.

## Injected Environment Variables

Once ready, Diverge injects variables like `KAFKA_TOPIC_MY_EVENT` pointing to the preview-specific topic (e.g., `my-event-pr-123`).

## Configuration

Configure async routes in your `Environment` CRD:

```yaml
spec:
  routing:
    asyncRoutes:
      - name: my-event
        type: kafka
        baseTopic: my-event-topic
```
