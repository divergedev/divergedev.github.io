---
title: Observability
description: Monitoring and alerting architecture
---

Effective observability is crucial for managing dynamic preview environments. Diverge is designed to be highly observable, providing operators with clear visibility into the system's state.

## Core Principles

1. **Native Metrics**: Diverge exposes metrics in the Prometheus exposition format.
2. **Controller Visibility**: Standard controller-runtime metrics are available for the operator.
3. **Health Checking**: Granular endpoints for liveness, readiness, and controller status.

## Component Monitoring

- **Controller**: Monitors API interactions, reconcile durations, queue depth, async route lifecycle, and per-environment cost estimation (`diverge_environment_estimated_hourly_cost_usd` labeled by `environment` and `namespace`).
- **Server**: Monitors RPC requests, latency, authentication attempts, and active streams.
- **Proxy & Activator**: Tracks routing decisions, cold-start wake-up events, and last-traffic timestamps (`divergedev.com/last-traffic-at`) used by the controller to enforce idle hibernation (`divergedev.com/hibernate-after`).

These metrics enable teams to build comprehensive Grafana dashboards, attribute preview infrastructure spend per pull request, and set up reliable alerting rules.
