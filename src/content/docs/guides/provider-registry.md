---
title: 'Provider Registry'
description: 'Add custom providers to Diverge'
---

Diverge uses a pluggable, extensible architecture via its generic `Registry[T]` pattern. This allows you to add custom routing, deployer, notifier, testing, or database providers with zero changes to the core controller logic.

## What the registry does

The Provider Registry manages implementations of different interfaces. When you configure Diverge to use a specific provider (e.g., `--routing-provider=gateway`), the registry looks up the correct implementation and initializes it.

## How to add a provider

You can add a new provider with just a single file using the `init()` pattern. This automatically registers the provider when the package is imported.

### Example: Adding a Linkerd Router

Create a file `internal/routing/linkerd/register.go`:

```go
package linkerd

import (
	"github.com/divergedev/diverge/internal/routing"
	"github.com/divergedev/diverge/pkg/registry"
)

func init() {
	routing.Providers.Register("linkerd", registry.Provider[routing.Router]{
		Create: func(deps registry.Deps) (routing.Router, error) {
			return &LinkerdRouter{Client: deps.Client}, nil
		},
		Description: "Linkerd SMI-based routing",
	})
}

type LinkerdRouter struct {
	Client client.Client
}

// Implement routing.Router interface methods...
```

Then add a blank import in `cmd/controller/main.go` (or a `providers_linkerd.go` file):

```go
import _ "github.com/divergedev/diverge/internal/routing/linkerd"
```

That's it — the controller will now accept `--routing-provider=linkerd`.

## Available provider types

The registry currently supports plugging in custom implementations for:

- **Routing** (`routing.Router`) — How traffic is directed (e.g., Gateway API, Istio, Linkerd).
- **Deployer** (`deployer.Deployer`) — How manifests are applied (e.g., DirectDeployer, ArgoCD, Knative).
- **Notifier** (`notifier.Notifier`) — How MR/PR updates are communicated (e.g., GitHub, GitLab).
- **Testing** (`testing.TestRunner`) — How integration tests are executed.
- **Database** (`database.DatabaseProvider`) — How databases are provisioned for preview environments.
