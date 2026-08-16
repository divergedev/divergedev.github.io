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

- **Controller**: Monitors API interactions, reconcile durations, and queue depth.
- **Server**: Monitors RPC requests, latency, and error rates.
- **Proxy**: Tracks routing decisions and connection states.

These metrics enable teams to build comprehensive Grafana dashboards and set up reliable alerting rules.
