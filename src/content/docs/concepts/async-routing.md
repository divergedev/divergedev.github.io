---
title: Async Routing
description: How Diverge handles non-HTTP workloads
---

While HTTP routing relies on request headers to direct traffic to preview environments, asynchronous workloads (like message queues or event streams) require a different approach.

## The Challenge

Systems like Kafka or RabbitMQ process messages that don't inherently contain HTTP headers. Routing these messages to the correct environment based on who produced them or who should consume them is complex.

## Architectural Approach

Diverge addresses this by provisioning isolated async routes for each preview environment. Rather than multiplexing messages on a single topic, Diverge creates dedicated topics or queues for the preview environment.

The backend services are injected with configuration (e.g., topic names) pointing to their isolated async infrastructure. This guarantees that messages produced in a preview environment are consumed only by services in that same environment, maintaining strict isolation.
