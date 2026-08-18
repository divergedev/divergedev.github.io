---
title: Hot Reload
description: Local development via Istio Ambient & Tailscale
---

Diverge allows you to run services locally on your laptop while securely routing cluster traffic to them. This provides instant hot-reloading for any language (`go run`, `npm run dev`) while keeping the rest of the application running in the cluster.

The same code that runs locally during development deploys as a Knative Service when you open a PR.

## Architecture: Istio Ambient + Tailscale

`diverge dev` creates a secure, zero-sidecar local development environment:

- **Tailscale WireGuard Tunnel**: Routes cluster traffic to your developer laptop through NATs and firewalls via an encrypted WireGuard tunnel (connecting directly when possible, or via Tailscale DERP relays when firewalls prevent direct peer-to-peer routing).
- **Istio Ambient Mesh**: Works seamlessly with Istio Ambient mode, requiring zero sidecars and no pod restarts for new pods in ambient-labeled namespaces. (Workloads currently using sidecars require sidecar removal and a rolling restart to join ambient mode).
- **Gateway API Routing**: Uses HTTPRoute to intercept traffic with the `x-diverge-env: <branch>` header and route it to your local machine. Traffic without the header falls back to the baseline environment.
- **Kubernetes Primitives**: Uses a headless ClusterIP `Service` and an `EndpointSlice` to map the cluster service to your Tailscale IP.

This architecture typically provides ~57ms round-trip time (RTT) for local requests over direct peer connections, though actual latency depends on network conditions, physical distance, and whether traffic traverses a relay.

## Workflow Integration

Pair `diverge dev --env-output file` with your favorite file-watching tool to achieve a hot-reload workflow.

### Supported Tools

You can use standard tools like:
- **Go**: Air
- **Node.js**: nodemon
- **Any language**: watchexec

### `--env-output` Modes

| Mode | Description |
|------|-------------|
| `inject` (default) | Injects environment variables directly into the child process. Best for simple `diverge dev -- go run main.go`. |
| `file` | Writes environment variables to a `.env.diverge` file. Best when pairing with external watchers. |

### Example Workflow

```bash
# Terminal 1: Route traffic and write env file
diverge dev --env-output file

# Terminal 2: Run watcher
watchexec -r -e go "source .env.diverge && go run main.go"
```

For in-cluster development workflows, check out the [DevSpace Integration](/guides/devspace) guide.
