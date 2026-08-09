---
title: CLI Reference
description: Diverge CLI commands
---

The Diverge CLI provides tools to interact with your preview environments directly from your terminal.

## Commands

### `diverge init`
Initializes a new `.diverge.yaml` configuration file in the current directory with sane defaults.

### `diverge list`
Lists all active preview environments for the current repository, along with their status, URL, and time-to-live (TTL).

### `diverge open`
Automatically opens the preview environment URL associated with the current branch/PR in your default web browser. It ensures the necessary headers are passed if required.
