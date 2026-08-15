---
title: 'Provider Registry'
description: 'Add custom providers to Diverge'
---

Diverge uses a pluggable, extensible architecture via its generic `Registry[T]` pattern. This allows you to add custom routing, deployer, notifier, testing, or database providers with zero changes to the core controller logic.

## What the registry does

The Provider Registry manages implementations of different interfaces. When you configure Diverge to use a specific provider in your `.diverge.yaml`, the registry looks up the correct implementation and initializes it.

## How to add a provider

You can add a new provider with just a single file using the `init()` pattern. This automatically registers the provider when the binary is compiled.

### Example: Adding a Linkerd Router

Create a file `providers/routing/linkerd/linkerd.go`:

```go
package linkerd

import (
	"context"
	"github.com/divergedev/diverge/pkg/providers"
	"github.com/divergedev/diverge/pkg/routing"
)

type LinkerdRouter struct {
	// configuration fields
}

func init() {
	providers.RoutingRegistry.Register("linkerd", func() routing.Router {
		return &LinkerdRouter{}
	})
}

// Implement routing.Router interface...
func (r *LinkerdRouter) Apply(ctx context.Context, config routing.Config) error {
	// ...
	return nil
}
```

## Available provider types

The registry currently supports plugging in custom implementations for:

- **Routing:** (`routing.Router`) - How traffic is directed (e.g., Istio, Gateway API, Linkerd).
- **Deployer:** (`deploy.Deployer`) - How manifests are applied (e.g., DirectDeployer, ArgoCD).
- **Notifier:** (`notify.Notifier`) - How updates are communicated (e.g., GitHub, GitLab, Slack).
- **Testing:** (`test.Runner`) - How integration tests are executed.
- **Database:** (`db.Manager`) - How databases are provisioned for preview environments.
