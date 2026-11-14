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
Diverge uses standard `controller-runtime` metrics for tracking reconcile loops and Kubernetes API interactions, plus custom metrics exported at `:8080/metrics`:
- `diverge_environment_estimated_hourly_cost_usd` (labels: `environment`, `namespace`): Estimated hourly compute and database cost in USD for each preview environment (compute drops to `0` when annotated with `divergedev.com/hibernated: "true"` or when the environment phase is hibernated, while isolated database burn is retained until teardown).
- `diverge_environment_hibernation_savings_hourly_usd` (labels: `environment`, `namespace`): Estimated hourly compute USD currently saved while a preview environment is hibernated.
- `diverge_environment_cpu_cores_requested` (labels: `environment`, `namespace`): Active CPU core requests attributed to preview workloads in each environment (`0` while hibernated).
- `diverge_environment_memory_gib_requested` (labels: `environment`, `namespace`): Active memory GiB requests attributed to preview workloads in each environment (`0` while hibernated).
- `diverge_environment_lifetime_seconds` (labels: `namespace`, `database_mode`): Histogram of total preview environment lifetimes observed upon finalizer teardown.
- `diverge_environment_ttl_remaining_seconds` (labels: `environment`, `namespace`): Seconds remaining until TTL expiry. Exports negative values when an environment is stuck past `ExpiresAt` in non-terminating phases so the `DivergeEnvironmentStuck` alert fires accurately.
- `diverge_controller_async_provisions_total` (labels: `protocol`, `result`): Total async route provisions.
- `diverge_controller_async_provision_duration_seconds` (labels: `protocol`): Async route provisioning duration.
- `diverge_controller_async_teardowns_total` (labels: `protocol`, `result`): Total async route teardowns.
- `diverge_controller_async_active_routes` (labels: `protocol`): Currently active async routes.

## Cost Attribution, Idle Hibernation, Namespace Quotas, & Baseline Drift

The controller and `ClusterService.GetCostSummary` continuously attribute cloud spend per `Environment` based on service counts using explicit `spec.serviceConfig.resources.cpuRequest` (`$0.04/vCPU-hr` default via `DIVERGE_COST_VCPU_HOUR_USD`) and `memoryRequest` (`$0.004/GiB-hr` default via `DIVERGE_COST_MEMORY_GIB_HOUR_USD`) when specified (falling back to `0.25 vCPU` + `0.5 GiB` = `$0.012/hr` per preview service) plus isolated database overhead (`$0.08/hr` default via `DIVERGE_COST_DB_DEDICATED_HOUR_USD` for `cnpg`/`neon`/`snapshot`/`fresh`, and `$0.01/hr` default via `DIVERGE_COST_DB_SCHEMA_HOUR_USD` for `schema`).

- **Idle Hibernation & Sleep/Wake History (`divergedev.com/hibernate-after`)**: Environments default to a `30m` idle threshold (`divergedev.com/hibernate-after: "30m"`; set `"0"` or `"off"` to disable). When idle, the controller scales managed preview `Deployment`s and `StatefulSet`s down to `0` replicas, marks `divergedev.com/hibernated: "true"`, records `divergedev.com/hibernated-at` and cumulative `divergedev.com/hibernated-seconds` across wake cycles, emits a `Hibernated` Kubernetes Event, and zeroes active compute cost while preserving exact active-hour accrued spend.
- **Namespace Quotas & FinOps LRU Auto-Hibernation**: Platform teams can annotate any Kubernetes `Namespace` to enforce hard FinOps budgets and cluster capacity guardrails:
  - `divergedev.com/max-active-environments`: Maximum concurrent non-hibernated preview `Environment`s in the namespace.
  - `divergedev.com/max-cnpg-clusters`: Maximum concurrent dedicated CloudNativePG (`cnpg`/`fresh`/`snapshot`) database clusters.
  - `divergedev.com/max-hourly-cost-usd`: Maximum aggregate hourly FinOps burn rate across active `Environment`s in the namespace (e.g., `"2.50"`).
  - `divergedev.com/quota-exceed-policy`: `"hibernate-oldest"` (default — automatically scales the least-recently-used active `Environment`s to zero replicas to make room for incoming PRs) or `"reject"` (marks the environment `Failed` with `QuotaReady=False` / `Reason: QuotaExceeded`).
- **Baseline Drift Detection & Auto-Refresh (`divergedev.com/drift-policy`)**: The controller computes a deterministic SHA-256 fingerprint (`divergedev.com/baseline-fingerprint`) over baseline `Deployment` pod specs (`Containers`, `InitContainers`, `env`, `envFrom`) and referenced `ConfigMap`s/`Secret`s (including projected volume `ConfigMap`/`Secret` sources), watching baseline `Deployment` and `ConfigMap` updates in real time:
  - `divergedev.com/drift-policy: "warn"` (default): Sets condition `BaselineDriftDetected=True` (`Reason: BaselineUpdated`), emits a `BaselineDriftDetected` Warning event, and surfaces `⚠️ drift` in `diverge top` for active environments (`💤 hibernated` takes display precedence while scaled to zero).
  - `divergedev.com/drift-policy: "sync"`: Automatically re-runs `Deployer.Deploy`, injects the updated `divergedev.com/baseline-fingerprint` into preview pod templates to trigger a rolling restart, and emits a `BaselineSynced` Normal event.
  - `divergedev.com/drift-policy: "ignore"`: Disables baseline drift checks for the environment.
- **End-to-End W3C Trace Context (`divergedev.com/traceparent`)**: GitHub and GitLab webhook handlers automatically extract incoming W3C `traceparent` HTTP headers (or mint a fresh `00-<trace-id>-<span-id>-01` trace context when absent) and attach `divergedev.com/traceparent` to created or updated `PreviewGroup`, `Environment`, and `AgentTask` CRs. `PreviewGroupReconciler` copies it to child `Environments`, `EnvironmentReconciler` links its OpenTelemetry reconcile span (`environment.name`, `environment.namespace`) to the caller's trace, and database migration and hook `Job` containers receive it as `TRACEPARENT`.
- **Web Dashboard FinOps Analytics (`/analytics`)**: The Diverge Web Dashboard includes a dedicated **Cost & Usage Analytics** page (`/analytics`) powered by `ClusterService.GetCostSummary`, surfacing fleet hourly burn, monthly run-rate, cumulative accrued spend, active service-hours, `AgentTask` LLM spend, hibernation & `PreviewGroup` delta-routing savings, per-namespace quota `<progress>` meters, per-service breakdowns, and sortable PR consumer tables alongside 1-click `Hibernate` / `Wake` controls and Magic Link copy buttons (`?_diverge_env=`).

## Health Endpoints

- `:9090/healthz`: Liveness probe
- `:8080/healthz`: Controller status
- `:8081/readyz`: Readiness probe

## Audit Logging

The Diverge server supports structured JSON audit logging for security and compliance. It logs details about authentication, authorization, and mutating API actions, including the user, action, and target resource.


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
