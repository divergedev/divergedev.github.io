---
title: Feature Flags & OpenFeature
description: Dynamic feature flag management and OpenFeature evaluation contexts for ephemeral preview environments
---

Diverge provides first-class support for feature flags and remote configuration across ephemeral preview environments using the vendor-neutral [OpenFeature](https://openfeature.dev) standard.

Rather than inventing a proprietary feature flag API, Diverge pairs a **runtime OpenFeature Hook** with a **pluggable control-plane provider interface**, allowing your existing application code and feature flag systems to work seamlessly without vendor lock-in.

---

## Architectural Model

Diverge's feature management operates across two decoupled planes:

```
┌─────────────────────────────────────────────────────────────┐
│ Control Plane (Diverge Controller)                         │
│                                                             │
│  diverge.yaml ──► FeatureProvider.Provision()               │
│                        │                                    │
│                        ▼                                    │
│        ┌───────────────────────────────┐                    │
│        │  diverge-features-<env> (CM)  │                    │
│        │   └── flags.json (flagd)      │                    │
│        │   └── overrides.json          │                    │
│        └───────────────────────────────┘                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mounts into Pod
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Plane (Application Pods)                               │
│                                                             │
│  HTTP Request (x-diverge-env: pr-42)                        │
│        │                                                    │
│        ▼                                                    │
│  diverge/sdk HTTP Middleware ──► context.Context            │
│                                       │                     │
│                                       ▼                     │
│  OpenFeature Client ──────────► DivergeHook.Before()        │
│                                       │                     │
│                                       ▼ Injects:            │
│                       diverge.environment = "pr-42"         │
│                       diverge.is_preview  = true            │
│                                       │                     │
│                                       ▼                     │
│  OpenFeature Provider (flagd / Flipt / Flagsmith / Unleash) │
└─────────────────────────────────────────────────────────────┘
```

1. **Control Plane (`FeatureProvider`)**: When an environment is created, the Diverge controller invokes the configured `FeatureProvider` to provision ephemeral feature rules or ConfigMaps scoped to that environment.
2. **Data Plane (`DivergeHook`)**: Application code makes standard OpenFeature evaluation calls. The `DivergeHook` transparently extracts the preview environment from the request context and enriches OpenFeature's `EvaluationContext` with `diverge.environment` and `diverge.is_preview`.

---

## Configuring `diverge.yaml`

Feature overrides can be declared globally, overridden per environment type, or injected on-demand via pull request labels:

```yaml
# diverge.yaml
version: "1"

defaults:
  features:
    provider: configmap
    overrides:
      checkout_v2: "false"
      billing_redesign: "false"
      rate_limit_per_minute: "100"

environments:
  preview:
    features:
      overrides:
        checkout_v2: "true" # Turn on new checkout in preview environments

label_overrides:
  flag/fast-checkout:
    features:
      overrides:
        checkout_v2: "true"
        fast_lane: "enabled"
```

### Provider Options

| Provider | Description | Infrastructure Required |
| :--- | :--- | :--- |
| `configmap` *(default)* | Generates a Kubernetes ConfigMap formatted for flagd / in-process JSON evaluation. | **Zero** — entirely Kubernetes-native. |
| `noop` | Disables feature flag provisioning. | None. |
| `flipt` | Manages ephemeral rules in an external Flipt instance. | Flipt server. |
| `flagsmith` | Manages environment flags and segment traits in Flagsmith. | Flagsmith server or cloud. |
| `unleash` | Scopes feature toggles in Unleash. | Unleash server. |

---

## The Zero-Infrastructure ConfigMap Provider

By default, Diverge uses the `configmap` provider. When an environment `pr-42` is provisioned:

1. Diverge generates a ConfigMap named `diverge-features-pr-42` in the environment's target namespace.
2. The ConfigMap contains a flagd-compliant `flags.json` file, along with raw key-value pairs:

```json
{
  "flags": {
    "checkout_v2": {
      "state": "ENABLED",
      "variants": {
        "on": true,
        "off": false
      },
      "defaultVariant": "on"
    }
  }
}
```

3. The ConfigMap is linked to the `Environment` via Kubernetes Owner References, ensuring automatic garbage collection when the preview environment is torn down.

---

## Application Integration with OpenFeature

In your application, register Diverge's `DivergeHook` on your OpenFeature client.

### Go Example

```go
package main

import (
	"context"
	"fmt"
	"net/http"

	of "github.com/open-feature/go-sdk/openfeature"
	divergeof "github.com/divergedev/diverge/pkg/sdk/openfeature"
	divergehttp "github.com/divergedev/diverge/pkg/sdk/http"
)

func main() {
	// 1. Create your OpenFeature client and register the DivergeHook
	client := of.NewClient("checkout-service")
	client.AddHooks(divergeof.NewDivergeHook())

	// 2. Wrap your HTTP handlers with Diverge context propagation middleware
	mux := http.NewServeMux()
	mux.HandleFunc("/checkout", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		// 3. Evaluate flags using standard OpenFeature APIs!
		// DivergeHook automatically injects diverge.environment and diverge.is_preview
		isV2Enabled, _ := client.BooleanValue(ctx, "checkout_v2", false, of.EvaluationContext{})

		if isV2Enabled {
			fmt.Fprintln(w, "Rendering Checkout V2 (Preview)")
		} else {
			fmt.Fprintln(w, "Rendering Checkout Baseline")
		}
	})

	handler := divergehttp.Middleware()(mux)
	http.ListenAndServe(":8080", handler)
}
```

When a request arrives with `x-diverge-env: pr-42`, the OpenFeature provider evaluates targeting rules matching `diverge.environment == "pr-42"`.

---

## Provider Discovery CLI

Inspect available providers registered on your cluster or CLI with `diverge providers list`:

```bash
$ diverge providers list
--- feature ---
NAME        DESCRIPTION
configmap   Kubernetes ConfigMap feature flag provider (flagd & OpenFeature file provider)
none        None feature flag provider (disables feature provisioning)
noop        No-op feature flag provider (disables feature provisioning)
```
