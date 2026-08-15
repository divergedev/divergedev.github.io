---
title: 'Environment Export'
description: 'Export preview environment variables'
---

The `diverge env export` command allows developers to easily retrieve environment variables and connection strings for their active preview environments. This bridges the gap between cluster-based previews and local development workflows.

## What it does

When a preview environment provisions resources like isolated databases or caches, the connection details are unique to that MR. `env export` securely retrieves these secrets and configuration values, formatting them for your local environment so you can run your application locally against the preview databases.

## Usage

```bash
diverge env export --service <name> [--format dotenv|json|shell] [--output <file>]
```

### Options

- `--service`: The name of the service in your `.diverge.yaml` to export variables for.
- `--format`: Output format. Defaults to `dotenv`. Supported: `dotenv`, `json`, `shell`.
- `--output`: File to write to (e.g., `.env`). If omitted, prints to stdout.

## Examples

### dotenv format (Default)

Export to a local `.env` file for use with tools that automatically load it (like Node.js, Python, etc.):

```bash
diverge env export --service api --format dotenv --output .env
```

**Output:**
```env
DATABASE_URL=postgres://user:pass@localhost:5432/mr-123-db
REDIS_HOST=localhost:6379
```

### JSON format

Export as JSON, useful for passing into scripts or CI tools:

```bash
diverge env export --service api --format json
```

**Output:**
```json
{
  "DATABASE_URL": "postgres://user:pass@localhost:5432/mr-123-db",
  "REDIS_HOST": "localhost:6379"
}
```

### Shell format

Export as shell exports, which you can `source` directly into your terminal session:

```bash
source <(diverge env export --service api --format shell)
```

**Output:**
```bash
export DATABASE_URL="postgres://user:pass@localhost:5432/mr-123-db"
export REDIS_HOST="localhost:6379"
```

## IDE Integration Tips

You can configure your IDE or editor to automatically run `diverge env export` as a pre-launch task.

For example, in VS Code `tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Fetch Preview Env",
      "type": "shell",
      "command": "diverge env export --service api --format dotenv --output .env",
      "presentation": {
        "reveal": "silent"
      }
    }
  ]
}
```
