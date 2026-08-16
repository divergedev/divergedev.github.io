---
title: Observability
description: Prometheus metrics, Grafana dashboards, and alerting for Diverge
---

Diverge exports comprehensive metrics for monitoring both the Controller and the Server.

## Metrics

### Server Metrics
- `diverge_server_rpc_requests_total`: Total RPC requests
- (Plus 7 other server metrics)

### Controller Metrics
Diverge uses standard `controller-runtime` metrics for tracking reconcile loops and Kubernetes API interactions.

## Health Endpoints

- `:9090/healthz`: Liveness probe
- `:8080/healthz`: Controller status
- `:8081/readyz`: Readiness probe

## ServiceMonitor Setup

Enable Prometheus ServiceMonitors via Helm:

```yaml
metrics:
  serviceMonitor:
    enabled: true

server:
  metrics:
    serviceMonitor:
      enabled: true
```

## Grafana Dashboards

You can import our official Grafana dashboards to visualize Diverge metrics out of the box.

## Alerting Rules

Set up Prometheus alerting rules to monitor for degraded performance or failing deployments.
