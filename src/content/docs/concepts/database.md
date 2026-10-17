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

## 2. Schema-Per-Env Mode (`mode: schema`)

**Best for:** Standard pull request testing where schema migrations, relational constraints, and seed data are involved.

In this mode, Diverge provisions a new, isolated logical schema within your existing shared PostgreSQL cluster. This provides sub-second relational isolation without the overhead of spinning up new database compute instances.

Diverge's `SchemaDatabaseProvider` handles the full lifecycle:

1. **Provision**:
   - Creates an isolated PostgreSQL schema named `preview_<env>` (sanitized with hyphens converted to underscores, validated against `^[a-z0-9][a-z0-9_-]*$`) and an isolated per-schema role (`diverge_preview_<schema>`) whose `search_path` is scoped to `preview_<env>,public` (with role passwords persisted durably in a managed Kubernetes Secret `diverge-db-role-<role>`).
   - **Base Tables, Sequences & Column Defaults (`LIKE public.<table> INCLUDING ALL`)**: Automatically clones all `public` base tables (`CREATE TABLE IF NOT EXISTS preview_<env>.<table> (LIKE public.<table> INCLUDING ALL)`), creates independent copies of all `public` sequences (`information_schema.sequences`), and re-maps `nextval('public.<seq>'::regclass)` column defaults to reference `preview_<env>.<seq>`.
   - **`FOREIGN KEY` Constraints (`pg_constraint WHERE contype = 'f'`)**: Because `LIKE ... INCLUDING ALL` does not copy foreign keys, `SchemaDatabaseProvider` queries `pg_constraint WHERE contype = 'f'` (`pg_get_constraintdef`), automatically rewrites intra-schema `REFERENCES public.<table>` (and unqualified `REFERENCES <table>`) references to point to the isolated `preview_<env>.<table>` tables, and applies them via `ALTER TABLE preview_<env>.<table> ADD CONSTRAINT ...`.
   - **`VIEW` Definitions (`information_schema.views`)**: Automatically clones all `public` views from `information_schema.views`, rewriting `public.` table qualifiers to `preview_<env>.` via `CREATE OR REPLACE VIEW preview_<env>.<view> AS ...`.
   - **`public` Schema Write-Protection**: Revokes `CREATE ON SCHEMA public` and `INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public` from the preview role while granting read-only fallback (`USAGE` and `SELECT`), and verifies via `has_schema_privilege` / `has_table_privilege` that the preview role holds zero effective write or `CREATE` privileges on `public` (catching unsafe `PUBLIC` pseudogroup grants before pods start).
   - **Topologically Ordered `seedSource` Data Seeding (`spec.database.seedSource`)**: When `spec.database.seedSource` is set to `public` or `schema:<name>`, Diverge copies rows across compatible writable non-generated columns (`INSERT INTO ... OVERRIDING SYSTEM VALUE SELECT ... ON CONFLICT DO NOTHING`) ordered topologically by foreign-key dependency count (`pg_constraint WHERE contype = 'f' ASC`) so parent tables are populated before child tables, and advances copied identity/serial sequences (`pg_get_serial_sequence` + `setval`). When set to `configmap:<name>/<key>` (default key: `seed.sql`), Diverge executes custom seed SQL from the referenced ConfigMap inside a transaction scoped to `SET LOCAL search_path TO preview_<env>, public`.
   - **PgBouncer-Friendly Bounded Connection Pooling**: Reuses a shared, bounded `*sql.DB` pool per admin DSN (`MaxOpenConns: 10`, `MaxIdleConns: 5`, `ConnMaxIdleTime: 5m`, `ConnMaxLifetime: 30m`) with connection-level `search_path=preview_<env>,public` and transaction-scoped `SET LOCAL search_path`, preventing connection exhaustion when running behind PgBouncer or RDS Proxy.
   - **Auto-Generated Connection Secret**: When `spec.database.connectionRef` is omitted in `schema` mode, the controller automatically creates (or updates) an owned Kubernetes `Secret` named `diverge-db-env-<env>-<hash8>` in the preview namespace containing `DATABASE_URL` (the schema-scoped connection string) and `DIVERGE_PREVIEW_SCHEMA` (`preview_<env>`), and sets `spec.database.connectionRef` to reference it so migration Jobs and application pods consume the isolated schema automatically.
2. **SetupSQL via Kubernetes Job**: If `setupSQL` is defined in the database configuration, Diverge provisions an ephemeral Kubernetes Job running `psql` within the preview namespace to execute the initialization script:
   - Admin credentials are mounted securely via Secret reference (`DATABASE_URL`).
   - The initialization SQL is mounted via a dedicated ConfigMap.
   - The default container image is pinned by sha256 digest to `postgres:17-alpine` (configurable via Helm at `database.setupJob.image`).
   - Out-of-process execution ensures arbitrary SQL cannot compromise controller process memory or exhaust controller database pools.
3. **Status**: Queries `information_schema.schemata` to verify the `preview_<env>` schema exists and monitors SetupSQL / migration Job completion.
4. **Teardown**: Drops the `preview_<env>` schema with `CASCADE`, drops the `diverge_preview_<schema>` role, and deletes the associated `diverge-db-env-<env>-<hash8>` and `diverge-db-role-<role>` Secrets and Job resources.

:::tip
Enable schema mode by setting `--database-provider=schema` on the controller (or use `--database-provider=cnpg` for full in-cluster CloudNativePG `Cluster` isolation).

For automated schema lifecycle management, Diverge integrates with **Ariga Atlas** for versioned migrations and declarative schema synchronization. Learn more in the [Atlas Schema Management Guide](/guides/database-atlas/).
:::

## 3. Snapshot Mode

**Best for:** Testing against production-like datasets.

Snapshot mode clones data from a production or staging snapshot into a dedicated database instance for the preview environment. This provides the highest fidelity for data-dependent testing but can be slower to provision and consume more resources.

## 4. Fresh Mode

**Best for:** Clean-slate testing and end-to-end integration tests.

Fresh mode provisions a completely new, empty database instance and executes your defined seed scripts or schema migrations to populate it. This ensures a consistent, predictable state for every preview environment.
