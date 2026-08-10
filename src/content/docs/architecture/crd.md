---
title: CRD Reference
description: Comprehensive reference for the Diverge Environment Custom Resource Definition (CRD).
---

The `Environment` Custom Resource Definition (CRD) is the declarative API for managing Diverge preview environments. It enforces strict OpenAPI validation schemas, including required fields, format constraints, and restricted enums.

## EnvironmentSpec

The `spec` defines the desired state of the preview environment.

### `source`
Defines where the code change originates.
- **`provider`**: The Git provider. Valid enums: `github`, `gitlab`.
- **`project`**: The repository or project identifier.
- **`mr`**: The pull/merge request number or ID.
- **`branch`**: The source branch name.

### `deploy`
Configures how the environment is deployed.
- **`mode`**: The deployment strategy. Valid enums: `delta` (deploy only changed services), `full` (deploy all services).
- **`changedServices`**: A list of services that have been modified.
- **`baselineRef`**: Reference to the baseline environment to share unchanged services with (used in `delta` mode).
- **`namespaceLabels`**: Optional map of labels to apply to the preview namespace. Useful for enabling Istio Ambient mesh (`istio.io/dataplane-mode: ambient`). Labels prefixed with `diverge.io/` are protected and cannot be overridden.

### `routing`
Configures ingress and traffic routing.
- **`mode`**: The routing strategy. Valid enums: `header`, `namespace`, `subdomain`.
- **`headerKey`**: The HTTP header key used for routing (validated against RFC 7230 token format).
- **`headerValue`**: The HTTP header value to match.

### `database`
Configures the data layer isolation.
- **`mode`**: Valid enums: `shared`, `schema`, `snapshot`, `fresh`.
- **`connectionRef`**: Secret reference containing credentials to the baseline database.

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
