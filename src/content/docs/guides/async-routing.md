---
title: Async Routing Guide
description: Configure Kafka, Temporal, Redis / Valkey, S3 / GCS / MinIO object storage, and webhook routing for preview environments
---

This guide walks you through setting up and configuring asynchronous and storage routing in Diverge for event-driven workloads, background workers, caches/queues, object storage buckets, and workflow orchestrators.

---

## 1. Provider Setup

Diverge supports Kafka, Temporal, Redis / Valkey, S3 / GCS / MinIO Object Storage, and custom Webhook async providers. Configure the controller with the appropriate flags and permissions for your environment.

### Kafka Provider Setup

The Kafka provider connects to your Kafka cluster via the AdminClient API (compatible with Apache Kafka, AutoMQ, Redpanda, and AWS MSK) to dynamically create and delete preview topics.

#### 1. Configure the Controller

Enable the Kafka provider in your Helm values or controller flags:

```yaml
# Helm values.yaml
controller:
  asyncProvider: kafka
  kafka:
    brokers:
      - "kafka-broker.kafka.svc.cluster.local:9092"
    partitions: 3
    replicationFactor: 1
```

Or via CLI flags on `diverge-controller`:
- `--async-provider=kafka`
- `--kafka-brokers=kafka-broker.kafka.svc.cluster.local:9092`
- `--kafka-partitions=3`
- `--kafka-replication-factor=1`

#### 2. Define the CRD Async Route

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: kafka
        target: order-events
```

When deployed, Diverge creates the topic `order-events-pr-456` and injects `KAFKA_TOPIC=order-events-pr-456`, `KAFKA_CONSUMER_GROUP=order-events-pr-456`, and `KAFKA_BROKERS` into your preview pod.

#### 3. Bounded Preview Topic Retention (`retention.ms`)

To prevent ephemeral preview topics from retaining data for the broker's default 7-day retention window, Diverge automatically sets `retention.ms` when creating (and updating via `AlterTopicConfigs`) preview topics:
- **Explicit Annotation (`divergedev.com/kafka-retention-ms`)**: Positive integer milliseconds (e.g., `"3600000"` for 1 hour).
- **Environment TTL (`spec.lifecycle.ttl`)**: Automatically converts a positive environment TTL (e.g., `4h` → `"14400000"`) into topic retention.
- **Default**: Falls back to `86400000` (24 hours).

---

### Temporal Provider Setup

The Temporal provider assigns preview-scoped task queues. Because Temporal automatically initializes task queues when a worker polls, no pre-provisioning API call is necessary.

#### 1. Configure the Controller

```yaml
# Helm values.yaml
controller:
  asyncProvider: temporal
  temporal:
    namespace: "default"
```

Or via CLI flags on `diverge-controller`:
- `--async-provider=temporal`
- `--temporal-namespace=default`

#### 2. Define the CRD Async Route

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: temporal
        target: billing-tasks
```

Diverge injects `TEMPORAL_TASK_QUEUE=billing-tasks-pr-456` and `TEMPORAL_NAMESPACE=default` into the preview worker container.

---

### Redis / Valkey Provider Setup

The Redis / Valkey provider isolates shared Redis or Valkey instances (caches, rate limiters, and BullMQ / Sidekiq / Celery queues) per preview environment using deterministic key prefixes (`preview:<env>:` for the `default` or empty target, or `preview:<env>:<target>:` for a named target) and performs automatic RESP wire-protocol `SCAN MATCH <prefix>*` + `UNLINK` (falling back to `DEL` on `-ERR` / `-NOPERM` and single-key `UNLINK`/`DEL` on Redis Cluster `-CROSSSLOT`) eviction on environment teardown. *(Note: Redis client `keyPrefix` options only prefix key arguments; if your application uses Redis Pub/Sub channels, pass channel names through `ResolveRedisKey` / `resolveRedisKey` / `resolve_redis_key` explicitly.)*

#### 1. Configure the Controller

```yaml
# Helm values.yaml
async:
  provider: redis # or valkey
  redis:
    addr: "redis-master.redis.svc.cluster.local:6379"
    username: "" # Optional Redis 6+ ACL username
    db: 0
```

Or via CLI flags / environment variables on `diverge-controller`:
- `--async-provider=redis` (or automatically resolved per route when `protocol: redis` or `protocol: valkey` is specified)
- `--redis-addr=redis-master.redis.svc.cluster.local:6379` (`DIVERGE_REDIS_ADDR`)
- `--redis-username` (`DIVERGE_REDIS_USERNAME`) and `DIVERGE_REDIS_PASSWORD`
- `--redis-db=0` (`DIVERGE_REDIS_DB`)

You can also override the target Redis endpoint or logical DB per `Environment` via annotations:
- `divergedev.com/redis-addr`: `"valkey.cache.svc.cluster.local:6379"`
- `divergedev.com/redis-db`: `"2"` *(nonzero logical databases require a standalone Redis/Valkey endpoint; Redis Cluster supports only database `0`)*

#### 2. Define the CRD Async Route

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: redis # or valkey
        target: cart-cache
```

When deployed (without a custom `envVarMapping`), Diverge injects `DIVERGE_REDIS_PREFIX=preview:pr-456:cart-cache:`, `REDIS_KEY_PREFIX=preview:pr-456:cart-cache:`, `REDIS_NAMESPACE=preview:pr-456:cart-cache` (or `preview:pr-456:` / `preview:pr-456` when `target` is `"default"` or omitted), and `REDIS_ADDR` (when configured) into the preview pod. When `pr-456` is deleted, the controller scans and unlinks all keys matching `preview:pr-456:cart-cache:*`.

---

### S3 / GCS / MinIO Object Storage Prefix Isolation (`protocol: s3 | gcs | minio`)

Shared staging buckets in Amazon S3, Google Cloud Storage (GCS), Cloudflare R2, or self-hosted MinIO can suffer from object key collisions and polluted test uploads when multiple preview environments run concurrently.

Diverge's Object Storage provider (`protocol: s3`, `protocol: gcs`, or `protocol: minio`) isolates object storage operations within a shared bucket using deterministic object key prefixes (`previews/<env>/` for the `default` or empty target, or `previews/<env>/<target>/` for a named target) and automatically purges objects under the preview prefix on environment teardown.

#### 1. Configure `.diverge.yaml` or `Environment` CR

```yaml
# .diverge.yaml
version: "1"

services:
  media-service:
    paths:
      - "services/media/**"
    image:
      repository: "ghcr.io/myorg/media-service"
      tag_template: "pr-{{.MR}}"
    asyncRoutes:
      - protocol: s3 # Supports: s3, gcs, or minio
        target: uploads # "default" -> previews/<env>/, or "uploads" -> previews/<env>/uploads/
```

Or directly on the `Environment` Custom Resource:

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: s3 # or gcs | minio
        target: uploads
```

When deployed (without a custom `envVarMapping`), Diverge injects `DIVERGE_STORAGE_PREFIX=previews/pr-456/uploads/` (or `previews/pr-456/` when `target` is `"default"` or omitted), `S3_KEY_PREFIX`, `AWS_S3_PREFIX`, `GCS_KEY_PREFIX`, and optional `DIVERGE_STORAGE_BUCKET` and `DIVERGE_STORAGE_ENDPOINT` into the preview pod.

---

### Webhook Provider Setup (Custom Infrastructure)

For external brokers like AWS SQS/SNS, RabbitMQ, or GCP Pub/Sub, use the Webhook provider to delegate provisioning to an external service.

#### 1. Configure the Controller

```yaml
# Helm values.yaml
controller:
  asyncProvider: webhook
  webhook:
    endpoint: "https://async-provisioner.infra.svc.cluster.local:8443/provision"
```

> **Note:** Use HTTPS for webhook endpoints in production. HTTP (`http://`) should only be used in trusted local development environments.

Or via CLI flags on `diverge-controller`:
- `--async-provider=webhook`
- `--async-webhook-endpoint=https://async-provisioner.infra.svc.cluster.local:8443/provision`

#### 2. Implement the Webhook Server

Your webhook server must handle `POST` requests for `provision` and `teardown` actions:

**Request Payload:**
```json
{
  "action": "provision",
  "environment": "pr-456",
  "namespace": "default",
  "route": {
    "protocol": "sqs",
    "target": "order-notifications"
  }
}
```

**Response Payload:**
```json
{
  "resolvedTarget": "order-notifications-pr-456",
  "envVars": {
    "SQS_QUEUE_URL": "https://sqs.us-east-1.amazonaws.com/123456789012/order-notifications-pr-456",
    "SQS_QUEUE_NAME": "order-notifications-pr-456"
  }
}
```

#### 3. Define the CRD Async Route

```yaml
apiVersion: divergedev.com/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: sqs
        target: order-notifications
```

The webhook response `envVars` (e.g., `SQS_QUEUE_URL`, `SQS_QUEUE_NAME`) are injected directly into the preview pod — no `envVarMapping` is needed when your webhook returns the full key-value pairs.

---

## 2. Injected Environment Variables

When async routes are provisioned, Diverge automatically injects standard environment variables into the preview containers:

| Provider | Injected Variable | Default Value Pattern | Description |
| :--- | :--- | :--- | :--- |
| **All** | `DIVERGE_ENV_NAME` | `<env-name>` | Preview environment name (e.g., `pr-456`). Injected by controller. |
| **Kafka** | `KAFKA_TOPIC` | `<target>-<env-name>` | Dedicated preview topic name |
| **Kafka** | `KAFKA_CONSUMER_GROUP` | `<target>-<env-name>` | Isolated consumer group name |
| **Kafka** | `KAFKA_BROKERS` | `broker1:9092,broker2:9092` | Comma-separated Kafka broker list |
| **Temporal** | `TEMPORAL_TASK_QUEUE` | `<target>-<env-name>` | Dedicated preview task queue name |
| **Temporal** | `TEMPORAL_NAMESPACE` | Value from controller flag | Temporal namespace |
| **Redis / Valkey** | `DIVERGE_REDIS_PREFIX` | `preview:<env-name>:` or `preview:<env-name>:<target>:` | Preview key namespace prefix (`default` vs. named target) |
| **Redis / Valkey** | `REDIS_KEY_PREFIX` | `preview:<env-name>:` or `preview:<env-name>:<target>:` | Alias for `DIVERGE_REDIS_PREFIX` |
| **Redis / Valkey** | `REDIS_NAMESPACE` | `preview:<env-name>` or `preview:<env-name>:<target>` | Prefix without trailing colon (for BullMQ `prefix` / Sidekiq namespace) |
| **Redis / Valkey** | `REDIS_ADDR` | `<host>:<port>` | Resolved Redis/Valkey endpoint (injected when configured) |
| **S3 / GCS / MinIO** | `DIVERGE_STORAGE_PREFIX` | `previews/<env-name>/` or `previews/<env-name>/<target>/` | Canonical object storage key prefix (`default` vs. named target) |
| **S3 / GCS / MinIO** | `S3_KEY_PREFIX` | `previews/<env-name>/` or `previews/<env-name>/<target>/` | S3 / MinIO / R2 key prefix alias |
| **S3 / GCS / MinIO** | `AWS_S3_PREFIX` | `previews/<env-name>/` or `previews/<env-name>/<target>/` | AWS S3 SDK key prefix alias |
| **S3 / GCS / MinIO** | `GCS_KEY_PREFIX` | `previews/<env-name>/` or `previews/<env-name>/<target>/` | Google Cloud Storage key prefix alias |
| **S3 / GCS / MinIO** | `DIVERGE_STORAGE_BUCKET` | `<bucket-name>` | Target object storage bucket (injected when configured) |
| **S3 / GCS / MinIO** | `DIVERGE_STORAGE_ENDPOINT` | `<endpoint-url>` | Custom S3/MinIO/GCS endpoint URL (injected when configured) |
| **Webhook** | Custom key-values | Specified by webhook response | Dynamic values returned by webhook endpoint |

### Custom Environment Variable Mappings

If your application expects different variable names, use `envVarMapping` in your route spec:

```yaml
spec:
  routing:
    asyncRoutes:
      - protocol: kafka
        target: checkout-events
        envVarMapping:
          MY_APP_KAFKA_TOPIC: "{{ .ResolvedTarget }}"
          MY_APP_CONSUMER_GROUP: "{{ .ResolvedTarget }}"
```

---

## 3. SDK Integration Examples

Diverge provides Go, Node.js, and Python SDK packages to propagate preview environment context across asynchronous message boundaries and shared caches.

### Kafka Header Propagation (`pkg/sdk/kafka`)

Use `pkg/sdk/kafka` to inject the preview environment tag (`x-diverge-env`) into Kafka headers on produce, and extract it on consume:

```go
package main

import (
	"context"
	"log"
	"os"

	divergekafka "github.com/divergedev/diverge/pkg/sdk/kafka"
	"github.com/twmb/franz-go/pkg/kgo"
)

func produceOrderEvent(ctx context.Context, client *kgo.Client, payload []byte) error {
	topic := os.Getenv("KAFKA_TOPIC")
	envName := os.Getenv("DIVERGE_ENV_NAME") // Injected by Diverge controller into preview pods (e.g. "pr-456")

	// 1. Prepare base Kafka headers
	headers := []divergekafka.Header{
		{Key: "Content-Type", Value: []byte("application/json")},
	}

	// 2. Inject preview routing header into metadata
	headers = divergekafka.InjectHeaders(headers, envName)

	// 3. Convert to Franz-go headers
	var kgoHeaders []kgo.RecordHeader
	for _, h := range headers {
		kgoHeaders = append(kgoHeaders, kgo.RecordHeader{Key: h.Key, Value: h.Value})
	}

	// 4. Produce the message
	record := &kgo.Record{
		Topic:   topic,
		Value:   payload,
		Headers: kgoHeaders,
	}

	return client.ProduceSync(ctx, record).FirstErr()
}

func consumeOrderEvent(record *kgo.Record) {
	var headers []divergekafka.Header
	for _, h := range record.Headers {
		headers = append(headers, divergekafka.Header{Key: h.Key, Value: h.Value})
	}

	// Extract the preview environment identifier
	envName := divergekafka.ExtractEnvName(headers)
	log.Printf("Received message for environment: %s\n", envName)
}
```

---

### Temporal Context Propagator (`pkg/sdk/temporal`)

Register Diverge's context propagator when initializing your Temporal client and worker to automatically pass preview environment context to child workflows and activities:

```go
package main

import (
	"context"
	"log"
	"os"

	divergetemporal "github.com/divergedev/diverge/pkg/sdk/temporal"
	"go.temporal.io/sdk/client"
	"go.temporal.io/sdk/worker"
	"go.temporal.io/sdk/workflow"
)

func main() {
	envName := os.Getenv("DIVERGE_ENV_NAME")     // Injected by Diverge controller into preview pods
	taskQueue := os.Getenv("TEMPORAL_TASK_QUEUE")
	namespace := os.Getenv("TEMPORAL_NAMESPACE")

	// 1. Create Temporal Client with Diverge Context Propagator
	c, err := client.Dial(client.Options{
		Namespace: namespace,
		ContextPropagators: []workflow.ContextPropagator{
			&divergetemporal.Propagator{
				EnvName: envName,
			},
		},
	})
	if err != nil {
		log.Fatalf("Unable to create Temporal client: %v", err)
	}
	defer c.Close()

	// 2. Start worker on preview task queue
	w := worker.New(c, taskQueue, worker.Options{})
	
	// Register workflows and activities
	// w.RegisterWorkflow(OrderProcessingWorkflow)
	// w.RegisterActivity(ProcessPaymentActivity)

	if err := w.Run(worker.InterruptCh()); err != nil {
		log.Fatalf("Worker failed: %v", err)
	}
}
```

---

### Redis / Valkey Key Prefix Resolution (`pkg/sdk`, `@divergedev/sdk`, `diverge-sdk`)

Use the Diverge SDK's Redis helpers to automatically prefix keys (`preview:<env>:<key>`) when running inside a preview pod or serving a preview-routed request, while leaving baseline keys untouched when no preview environment is active:

**Go (`github.com/divergedev/diverge/pkg/sdk`):**
```go
import "github.com/divergedev/diverge/pkg/sdk"

key := sdk.ResolveRedisKey(ctx, "cart:user-42")
// Preview "pr-456" -> "preview:pr-456:cart:user-42"
// Baseline         -> "cart:user-42"
```

**Node.js / TypeScript (`@divergedev/sdk`):**
```ts
import { resolveRedisKey, redisKeyPrefix } from '@divergedev/sdk';

const key = resolveRedisKey('cart:user-42');
// Direct ioredis client: new Redis({ keyPrefix: redisKeyPrefix() })
// BullMQ Queue/Worker:   new Queue('orders', { prefix: process.env.REDIS_NAMESPACE || 'bull' })
```

**Python (`diverge-sdk`):**
```python
from diverge_sdk import resolve_redis_key

key = resolve_redis_key("cart:user-42")
```

---

### S3 / GCS / MinIO Object Storage Key Prefix Resolution (`pkg/sdk`, `@divergedev/sdk`, `diverge-sdk`)

Use the Diverge SDK's object storage helpers to automatically prefix object keys (`previews/<env>/<key>`) when running inside a preview pod or serving a preview-routed request, while leaving baseline object keys untouched when no preview environment is active:

**Go (`github.com/divergedev/diverge/pkg/sdk`):**
```go
import "github.com/divergedev/diverge/pkg/sdk"

objectKey := sdk.ResolveStorageKey(ctx, "avatars/user-1.png")
// Preview "pr-456" -> "previews/pr-456/avatars/user-1.png"
// Baseline         -> "avatars/user-1.png"
```

**Node.js / TypeScript (`@divergedev/sdk`):**
```ts
import { resolveStorageKey, storageKeyPrefix } from '@divergedev/sdk';

const objectKey = resolveStorageKey('avatars/user-1.png');
// Preview "pr-456" -> "previews/pr-456/avatars/user-1.png"
// Baseline         -> "avatars/user-1.png"
```

**Python (`diverge-sdk`):**
```python
from diverge_sdk import resolve_storage_key

object_key = resolve_storage_key("avatars/user-1.png")
# Preview "pr-456" -> "previews/pr-456/avatars/user-1.png"
# Baseline         -> "avatars/user-1.png"
```

---

## 4. KEDA Auto-Scaling Integration

To prevent idle preview workers from consuming cluster resources, configure KEDA to scale your consumer deployments down to zero replicas when no messages are queued.

### Example KEDA `ScaledObject` for Kafka Preview Consumers

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: payment-worker-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: payment-worker-pr-456
  minReplicaCount: 0
  maxReplicaCount: 5
  cooldownPeriod: 60
  pollingInterval: 15
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-broker.kafka.svc.cluster.local:9092
        topic: payment-events-pr-456
        consumerGroup: payment-events-pr-456
        lagThreshold: "1"
```

When events are published to `payment-events-pr-456`, KEDA detects lag on the topic partition and scales the deployment from 0 to 1 replica.

---

## 5. Troubleshooting & Status Verification

### Checking the `AsyncRoutingReady` Condition

Verify whether async routes were successfully provisioned by inspecting the `Environment` resource conditions:

```bash
kubectl get environment pr-456 -o jsonpath='{.status.conditions[?(@.type=="AsyncRoutingReady")]}'
```

Output example for a healthy route:

```json
{
  "lastTransitionTime": "2026-08-28T22:30:00Z",
  "message": "Async routes provisioned successfully",
  "reason": "AsyncRoutesProvisioned",
  "status": "True",
  "type": "AsyncRoutingReady"
}
```

### Common Failure Modes

1. **Broker Connection Refused**:
   - **Reason**: `ProvisioningFailed`
   - **Message**: `kafka client error: dial tcp 10.96.0.1:9092: connect: connection refused`
   - **Fix**: Check your controller's `--kafka-brokers` setting and verify network policies permit outbound traffic from the controller to the broker.

2. **Webhook Endpoint Timeout**:
   - **Reason**: `WebhookTimeout`
   - **Message**: `webhook provision failed: context deadline exceeded`
   - **Fix**: Ensure your custom webhook service is healthy and responds within the 30-second timeout window.

3. **Controller Logs**:
   ```bash
   kubectl logs -n diverge-system deployment/diverge-controller -c manager -f | grep "async"
   ```

---

## 6. Slim Builds (Build Tags)

If your cluster only uses HTTP routing or does not require Kafka/Temporal dependencies, you can compile or deploy slim controller binaries using Go build tags.

### Available Build Tags

- `no_kafka`: Strips the Kafka AdminClient and Franz-Go dependencies.
- `no_temporal`: Strips the Temporal Go SDK dependencies.

### Compiling Slim Binaries

```bash
# Exclude Kafka provider
go build -tags no_kafka -o bin/diverge-controller ./cmd/controller

# Exclude Temporal provider
go build -tags no_temporal -o bin/diverge-controller ./cmd/controller

# Exclude both for a lightweight HTTP-only controller
go build -tags "no_kafka,no_temporal" -o bin/diverge-controller ./cmd/controller
```

This reduces the final binary size and removes unnecessary external client dependencies.
