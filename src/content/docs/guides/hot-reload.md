---
title: Hot Reload
description: File-watching development workflows with diverge dev
---

Pair `diverge dev --env-output file` with your favorite file-watching tool to achieve a hot-reload workflow while routing cluster traffic to your local machine.

## Supported Tools

You can use standard tools like:
- **Go**: Air
- **Node.js**: nodemon
- **Any language**: watchexec

## `--env-output` Modes

| Mode | Description |
|------|-------------|
| `inject` (default) | Injects environment variables directly into the child process. Best for simple `diverge dev -- go run main.go`. |
| `file` | Writes environment variables to a `.env.diverge` file. Best when pairing with external watchers. |

## Example Workflow

```bash
# Terminal 1: Route traffic and write env file
diverge dev --env-output file

# Terminal 2: Run watcher
watchexec -r -e go "source .env.diverge && go run main.go"
```

For in-cluster development workflows, check out the [DevSpace Integration](/guides/devspace) guide.
