---
title: CRD Reference
description: Comprehensive reference for the Diverge Environment, PreviewGroup, and AgentTask Custom Resource Definitions (CRDs).
---

Diverge provides three Kubernetes Custom Resource Definitions (CRDs) under the `divergedev.com/v1alpha1` API group:
1. **`Environment`** (Namespaced) — Manages an isolated preview deployment, route, and database for a service.
2. **`PreviewGroup`** (Cluster-scoped) — Coordinates multi-service delta preview environments across namespaces for a single Pull/Merge Request.
3. **`AgentTask`** (Namespaced) — Runs an autonomous AI coding agent inside a network-isolated sandbox pod with Macaroon capability tokens, budget guardrails, and an optional linked preview `Environment`.

---

## 1. `Environment` (`EnvironmentSpec` & `EnvironmentStatus`)

The `spec` defines the desired state of the preview environment.

### `source`
Defines where the code change originates.
- **`provider`**: The Git provider. Valid enums: `github`, `gitlab`, `local`.
- **`project`**: The repository or project identifier.
- **`mr`**: The pull/merge request number or ID.
- **`branch`**: The source branch name.

### `deploy`
Configures how the environment is deployed.
- **`mode`**: The deployment strategy. Valid enums: `delta` (deploy only changed services), `full` (deploy all services).
- **`changedServices`**: A list of services that have been modified.
- **`baselineRef`**: Reference to the baseline environment to share unchanged services with (used in `delta` mode).
- **`namespaceLabels`**: Optional map of labels to apply to the preview namespace. Useful for enabling Istio Ambient mesh (`istio.io/dataplane-mode: ambient`). Labels prefixed with `divergedev.com/` are protected and cannot be overridden.

### `routing`
Configures ingress, mesh, and asynchronous / storage traffic routing.
- **`mode`**: The routing strategy. Valid enums: `header`, `namespace`, `subdomain`.
- **`headerKey`**: The HTTP header key used for routing (validated against RFC 7230 token format).
- **`headerValue`**: The HTTP header value to match.
- **`baseDomain`**: Base domain used when `mode: subdomain` (e.g., `preview.example.com`). Supports automatic `external-dns` (`divergedev.com/external-dns: "true"` or `divergedev.com/external-dns-hostname`) annotation propagation onto generated `HTTPRoute` / `GRPCRoute` resources and `cert-manager` (`divergedev.com/cluster-issuer` or `divergedev.com/issuer`) Gateway TLS and `Certificate` provisioning.
- **`asyncRoutes`**: List of asynchronous and storage isolation routes (`protocol` + `target` + optional `envVarMapping`). Supported `protocol` values:
  - `kafka`: Provisions isolated topic (`<target>-<env>`) and consumer group (`KAFKA_TOPIC`, `KAFKA_CONSUMER_GROUP`, `KAFKA_BROKERS`).
  - `temporal`: Assigns isolated task queue (`TEMPORAL_TASK_QUEUE=<target>-<env>`, `TEMPORAL_NAMESPACE`).
  - `redis` / `valkey`: Isolates shared keyspaces via prefix (`DIVERGE_REDIS_PREFIX`, `REDIS_KEY_PREFIX`, `REDIS_NAMESPACE`, `REDIS_ADDR`) and evicts keys on teardown.
  - `s3` / `gcs` / `minio`: Isolates shared object storage buckets via deterministic prefix (`DIVERGE_STORAGE_PREFIX=previews/<namespace>/<env>/` or `previews/<namespace>/<env>/<target>/`, `S3_KEY_PREFIX`, `AWS_S3_PREFIX`, `GCS_KEY_PREFIX`, plus `DIVERGE_STORAGE_BUCKET` and `DIVERGE_STORAGE_ENDPOINT` when configured).
  - `webhook`: Delegates provisioning and teardown to an external HTTP webhook.

### `serviceConfig`
Configures service-level deployment and Gateway API target settings.
- **`serviceName`**: Target baseline Kubernetes `Service` name (used for GAMMA east-west mesh routing).
- **`parentRef`**: Gateway API parent reference name. Supports explicit `Gateway/<name>` and `Service/<name>` disambiguation prefixes, the `divergedev.com/parent-kind: Gateway | Service` annotation, and automatic cluster `Gateway` lookup.

### `database`
Configures the data layer isolation.
- **`mode`**: Valid enums: `shared`, `schema`, `snapshot`, `fresh`.
- **`connectionRef`**: Secret reference containing credentials to the baseline database (auto-generated as `diverge-db-env-<env>-<hash8>` when omitted in `schema` mode).
- **`seedSource`**: Optional seed data source in `schema` mode (`public`, `schema:<name>`, or `configmap:<name>[/<key>]`) or source cluster name in `cnpg` `snapshot` mode.

### `lifecycle`
Manages the environment lifespan.
- **`ttl`**: Time-to-Live duration before auto-expiry (e.g., `72h`).
- **`cleanupOnMerge`**: Boolean indicating if the environment should be deleted upon MR merge/close.

## EnvironmentStatus

The `status` subresource is updated by the Diverge controller to reflect the current state. Diverge uses a deep copy baseline for all status patches to ensure atomic updates.

- **`phase`**: Current lifecycle phase (e.g., `Pending`, `Deploying`, `Running`, `Failed`, `Terminating`).
- **`url`**: The preview URL for the environment.
- **`services`**: Status of individual services within the environment.
- **`conditions`**: Standard Kubernetes conditions (`NamespaceReady`, `DatabaseReady`, etc.).
- **`createdAt`**: Timestamp of environment creation.
- **`expiresAt`**: Timestamp of calculated TTL expiry.
- **`commitSHA`**: The git commit SHA associated with this environment, used for commit status reporting.
- **`commentID`**: The ID of the MR/PR comment created by the notifier, enabling updates to existing comments.
- **`commitStatusURL`**: The URL of the commit status check posted to GitLab/GitHub.

---

## 2. `PreviewGroup` (`PreviewGroupSpec` & `PreviewGroupStatus`)

`PreviewGroup` is a **cluster-scoped** CRD that manages a set of child `Environment` resources across one or more namespaces for a pull/merge request.

### `PreviewGroupSpec`
- **`source`**: Origin metadata (`provider`: `github` | `gitlab` | `local`, `project`, `mr`, `branch`).
- **`routing`**: Shared routing header configuration (`headerKey`, `headerValue`, `externalURL`).
- **`services`**: List of `ServicePreviewSpec` entries (`name`, `namespace`, `mode`: `image` | `local` | `baseline`, `image`, `port`, `localEndpoint`, `database`, `asyncRoutes`).
- **`lifecycle`**: Group lifespan (`ttl`, `cleanupOnMerge`).

### `PreviewGroupStatus`
- **`phase`**: Current phase (`Pending`, `Deploying`, `Running`, `Degraded`, `Failed`, `Terminating`).
- **`services`**: Per-service status (`name`, `namespace`, `mode`, `environmentName`, `phase`, `url`, `ready`).
- **`conditions`**: Standard Kubernetes conditions (`Ready`, `ReferenceGrantsReady`).

---

## 3. `AgentTask` (`AgentTaskSpec` & `AgentTaskStatus`)

`AgentTask` is a **namespaced** CRD that provisions an isolated autonomous coding agent sandbox with cryptographic Macaroon capability tokens and live LLM budget metering.

### `AgentTaskSpec`
- **`objective`**: Natural-language objective for the coding agent (`MinLength: 1`).
- **`repository`**: Target Git repository (`url`, `baseBranch`, `workingBranch`).
- **`sandbox`**: Sandbox execution settings (`provider`: `agent-sandbox` | `pod` | `k8s-pod` | `noop`, `poolRef`, `templateRef`, `timeoutSeconds`).
- **`budgetUSD`**: Maximum LLM spend in USD formatted as a decimal string (e.g. `"5.00"`).
- **`budgetTokens`**: Maximum total LLM tokens allowed (e.g. `200000`).
- **`maxIterations`**: Maximum build-verify-fix iterations (default: `5`, max: `20`).
- **`capabilities`**: Allowed model identifiers or prefix wildcards encoded into the Macaroon capability token (e.g. `["claude-3-7-sonnet", "gemini-2.5-pro"]`).
- **`draftPR`**: Whether to open a draft PR/MR upon completion (default: `true`).
- **`suspended`**: When `true`, suspends the sandbox (`operatingMode: Suspended`), revokes the active Macaroon token, and hibernates the linked preview `Environment`.

### `AgentTaskStatus`
- **`phase`**: Current lifecycle phase (`Pending`, `Provisioning`, `Active`, `Pausing`, `Paused`, `Completed`, `Failed`).
- **`sandboxClaimName`**: Name of the provisioned `SandboxClaim` or sandbox `Pod`.
- **`sandboxReady`**: Boolean indicating whether the sandbox pod is ready.
- **`iterations`**: Current autonomous loop iteration count.
- **`tokensConsumed`**: Cumulative LLM tokens reported via `POST /api/v1/agenttask/meter`.
- **`costUSD`**: Cumulative LLM spend in USD formatted to 4 decimal places.
- **`lastMeterRequestIds`**: Bounded 32-entry ring buffer of recent metering `requestId` values for idempotent deduplication across server replicas.
- **`pullRequestURL`** / **`pullRequestID`**: Created draft PR/MR URL and number.
- **`conditions`**: Standard Kubernetes conditions (`SandboxReady`, `PreviewEnvironmentReady`, `TaskCompleted`).
