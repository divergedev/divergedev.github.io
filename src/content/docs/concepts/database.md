---
title: Database Modes
description: Comprehensive overview of Diverge's database isolation strategies for preview environments.
---

Preview environments often need varying levels of database isolation. Diverge provides four distinct database modes to fit your specific testing requirements and infrastructure constraints.

## 1. Shared Mode

**Best for:** Read-heavy workloads or completely stateless previews.

In Shared mode, the preview environment connects directly to the baseline (e.g., staging) database. No new database resources are provisioned.

:::caution
Writes from the preview environment will affect the shared database. Use this mode carefully if your services perform destructive database operations.
:::

## 2. Schema-Per-Env Mode

**Best for:** Standard pull request testing where schema migrations are involved.

In this mode, Diverge provisions a new, isolated logical schema (or database) within your existing shared database cluster. This provides logical isolation without the overhead of spinning up new database compute instances.

Diverge's `SchemaProvider` handles the full lifecycle:

1. **Provision**: Creates a PostgreSQL schema with a sanitized name (format: `diverge_env_<name>`, validated against `^[a-z][a-z0-9_]{0,62}$`). A Kubernetes Secret containing the `DATABASE_URL` is created in the preview namespace.
2. **Status**: Queries `information_schema.schemata` to verify the schema exists.
3. **Teardown**: Drops the schema with `CASCADE` and deletes the associated Secret.

:::tip
Enable schema mode by setting `--database-provider=schema` on the controller. The provider connects to your existing PostgreSQL/AlloyDB cluster and manages schemas within it.
:::

## 3. Snapshot Mode

**Best for:** Testing against production-like datasets.

Snapshot mode clones data from a production or staging snapshot into a dedicated database instance for the preview environment. This provides the highest fidelity for data-dependent testing but can be slower to provision and consume more resources.

## 4. Fresh Mode

**Best for:** Clean-slate testing and end-to-end integration tests.

Fresh mode provisions a completely new, empty database instance and executes your defined seed scripts or schema migrations to populate it. This ensures a consistent, predictable state for every preview environment.
