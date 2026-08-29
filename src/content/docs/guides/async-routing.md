---
title: Async Routing Guide
description: Configure Kafka, Temporal, and webhook routing for preview environments
---

This guide walks you through setting up and configuring asynchronous routing in Diverge for event-driven workloads, background workers, and workflow orchestrators.

---

## 1. Provider Setup

Diverge supports Kafka, Temporal, and custom Webhook async providers. Configure the controller with the appropriate flags and permissions for your environment.

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
apiVersion: diverge.io/v1alpha1
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
apiVersion: diverge.io/v1alpha1
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

### Webhook Provider Setup (Custom Infrastructure)

For external brokers like AWS SQS/SNS, RabbitMQ, or GCP Pub/Sub, use the Webhook provider to delegate provisioning to an external service.

#### 1. Configure the Controller

```yaml
# Helm values.yaml
controller:
  asyncProvider: webhook
  webhook:
    endpoint: "http://async-provisioner.infra.svc.cluster.local:8080/provision"
```

Or via CLI flags on `diverge-controller`:
- `--async-provider=webhook`
- `--async-webhook-endpoint=http://async-provisioner.infra.svc.cluster.local:8080/provision`

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
apiVersion: diverge.io/v1alpha1
kind: Environment
metadata:
  name: pr-456
  namespace: default
spec:
  routing:
    asyncRoutes:
      - protocol: sqs
        target: order-notifications
        envVarMapping:
          SQS_QUEUE_URL: "{{ .ResolvedTarget }}"
```

---

## 2. Injected Environment Variables

When async routes are provisioned, Diverge automatically injects standard environment variables into the preview containers:

| Provider | Injected Variable | Default Value Pattern | Description |
| :--- | :--- | :--- | :--- |
| **Kafka** | `KAFKA_TOPIC` | `<target>-<env-name>` | Dedicated preview topic name |
| **Kafka** | `KAFKA_CONSUMER_GROUP` | `<target>-<env-name>` | Isolated consumer group name |
| **Kafka** | `KAFKA_BROKERS` | `broker1:9092,broker2:9092` | Comma-separated Kafka broker list |
| **Temporal** | `TEMPORAL_TASK_QUEUE` | `<target>-<env-name>` | Dedicated preview task queue name |
| **Temporal** | `TEMPORAL_NAMESPACE` | Value from controller flag | Temporal namespace |
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

Diverge provides Go SDK packages to propagate preview environment context across asynchronous message boundaries.

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
	envName := os.Getenv("DIVERGE_ENV_NAME") // e.g. "pr-456"

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
)

func main() {
	envName := os.Getenv("DIVERGE_ENV_NAME")
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
