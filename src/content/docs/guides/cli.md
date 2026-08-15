---
title: CLI Reference
description: Diverge CLI commands
---

The Diverge CLI provides tools to interact with your preview environments directly from your terminal.

## Commands

### `diverge dev`
Starts local development mode, routing traffic for a specific service to your local machine while proxying other requests to the baseline environment.

### `diverge env export`
Exports environment variables and connection strings for an active preview environment. Supports `dotenv`, `json`, and `shell` output formats.

### `diverge preview`
Creates and manages preview environments. (Alias for or successor to `create`).

### `diverge create`
Creates a new preview environment.

### `diverge list`
Lists all active preview environments for the current repository.

### `diverge delete`
Deletes an active preview environment.

### `diverge open`
Automatically opens the preview environment URL associated with the current branch/PR in your default web browser.

### `diverge logs`
Fetches and tails logs for the preview environment.

### `diverge validate`
Validates the local diverge configuration.

### `diverge version`
Prints the installed Diverge CLI version.
