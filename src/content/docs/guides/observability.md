---
title: Observability
description: Prometheus metrics, Grafana dashboards, and alerting for Diverge
---

Diverge exports comprehensive metrics for monitoring both the Controller and the Server.

## Metrics

### Server Metrics
The Diverge server collects the following metrics under the `diverge_server` namespace/subsystem:
- `diverge_server_rpc_requests_total`: Total number of RPC requests by method and status.
- `diverge_server_rpc_request_duration_seconds`: RPC request duration in seconds.
- `diverge_server_rpc_stream_duration_seconds`: Duration of streaming RPCs in seconds.
- `diverge_server_rpc_active_streams`: Number of active streaming RPCs.
- `diverge_server_auth_attempts_total`: Authentication attempts by provider and result.
- `diverge_server_broadcaster_subscribers`: Number of active broadcaster subscribers.
- `diverge_server_broadcaster_events_total`: Total number of broadcaster events.
- `diverge_server_broadcaster_drops_total`: Total number of broadcaster drops.

### Controller Metrics
Diverge uses standard `controller-runtime` metrics for tracking reconcile loops and Kubernetes API interactions.

## Health Endpoints

- `:9090/healthz`: Liveness probe
- `:8080/healthz`: Controller status
- `:8081/readyz`: Readiness probe

## ServiceMonitor Setup

Diverge can be configured to automatically create `ServiceMonitor` objects by enabling them in the Helm values (`.Values.metrics.serviceMonitor.*` for the controller, and `.Values.server.metrics.serviceMonitor.*` for the server). This allows Prometheus Operator to automatically discover and scrape the metrics endpoints:

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

Import the reference Grafana dashboards provided in the `deploy/grafana/` directory of the [Diverge repository](https://github.com/divergedev/diverge) to visualize Diverge server and controller metrics out of the box.

## Alerting Rules

Deploy the pre-configured Prometheus alerting rules provided in the `deploy/prometheus/` directory of the [Diverge repository](https://github.com/divergedev/diverge) to monitor for high RPC error rates, anomalous stream durations, or failing deployments.
