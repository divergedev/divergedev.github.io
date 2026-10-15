---
title: Atlas Schema Management
description: Manage and isolate database schemas in Diverge preview environments using Ariga Atlas.
---

Diverge integrates directly with [Ariga Atlas](https://atlasgo.io/) to automate schema provisioning, versioned migrations, and declarative schema synchronization inside preview environments.

Whether you manage schema changes through versioned migration files or declarative schema definitions, Diverge handles connection string scoping, migration execution, and automatic teardown.

---

## Key Capabilities

1. **Dual Migration Paradigms**:
   - **Versioned Migrations (`mode: versioned`)**: Executes migration files in sequence (e.g. Flyway / Goose / Atlas directory structure) validated by `atlas.sum`.
   - **Declarative Schemas (`mode: declarative`)**: Synchronizes the preview schema directly from a desired state defined in SQL DDL or HCL.
2. **Flexible Execution Engines**:
   - **Standalone Job (`engine: "job"`)**: Executes an ephemeral Kubernetes Job using `arigaio/atlas:latest`. Does not require installing the Atlas Kubernetes Operator.
   - **Operator Mode (`engine: "operator"`)**: Delegates schema reconciliation to the official [Atlas Kubernetes Operator](https://atlasgo.io/integrations/kubernetes/operator) using `AtlasMigration` and `AtlasSchema` Custom Resources.
3. **Strict Schema Isolation**:
   - Target database URLs are automatically scoped to the preview schema via `search_path=preview_<env>,public`, ensuring migrations never mutate baseline or production tables.
4. **Automated Migration Invalidation**:
   - Diverge hashes the migration ConfigMap's `ResourceVersion` into the Kubernetes Job name. When you commit new migration files, Diverge automatically triggers a new migration run on the preview database.

---

## Configuration in `diverge.yaml`

Configure Atlas under the `database` section of your `diverge.yaml`:

```yaml
version: "1"

defaults:
  database:
    mode: schema
    connection_ref: staging-postgres
    atlas:
      mode: versioned
      engine: job # "job" (standalone K8s Job) or "operator" (Atlas CRDs)
      migration_config_map: app-migrations
      blocking: true # Environment waits for migrations before marking DatabaseReady
      policy:
        destructive: error # "error" | "warn" | "allow"

environments:
  declarative-preview:
    database:
      atlas:
        mode: declarative
        engine: job
        schema_config_map: app-schema
        policy:
          destructive: allow
```

---

## Migration Modes

### 1. Versioned Migrations (`mode: versioned`)

In versioned mode, Atlas runs `atlas migrate apply` against your preview database. Your migrations directory (containing `.sql` files and `atlas.sum`) is mounted into the migration runner from a Kubernetes ConfigMap.

```yaml
database:
  mode: schema
  connection_ref: staging-postgres
  atlas:
    mode: versioned
    engine: job
    migration_config_map: db-migrations
```

The ConfigMap should contain the files in your migrations directory:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-migrations
  namespace: default
data:
  atlas.sum: |
    h1:47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=
  20240101000000_init.sql: |
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE
    );
```

When Diverge detects changes to `db-migrations` (via its `ResourceVersion`), it generates a new hashed Job name and applies subsequent migrations automatically.

---

### 2. Declarative Schema (`mode: declarative`)

In declarative mode, Atlas inspects the preview database schema and applies schema diffs to reach the desired state defined in your schema ConfigMap:

```yaml
database:
  mode: schema
  connection_ref: staging-postgres
  atlas:
    mode: declarative
    engine: job
    schema_config_map: app-schema
    policy:
      destructive: allow
```

Your schema ConfigMap can supply either `schema.sql` (standard SQL DDL) or `schema.hcl`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-schema
  namespace: default
data:
  schema.sql: |
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(255) NOT NULL UNIQUE
    );

    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      published_at TIMESTAMPTZ
    );
```

Diverge invokes `atlas schema apply --url $(DATABASE_URL) --to file:///schema/schema.sql --auto-approve`. If `policy.destructive` is set to `allow`, the `--allow-destructive` flag is passed to enable schema drops when columns or tables are removed in PR branches.

---

## Execution Engines

### Standalone Job Engine (`engine: "job"`)

The standalone Job engine runs an isolated, security-hardened Kubernetes Job:

- **Image**: Defaults to `arigaio/atlas:latest` (or custom override via `image`).
- **Security Profile**:
  - `RunAsNonRoot: true`
  - `ReadOnlyRootFilesystem: true`
  - `AllowPrivilegeEscalation: false`
  - Dropped capabilities: `ALL`
  - Seccomp profile: `RuntimeDefault`
  - `HOME=/tmp` with emptyDir volume for writable AST and schema cache
- **No CRDs Required**: Runs on any Kubernetes cluster without requiring cluster-admin privileges to install CRDs or controllers.

### Atlas Operator Engine (`engine: "operator"`)

If your cluster already runs the [Atlas Kubernetes Operator](https://atlasgo.io/integrations/kubernetes/operator), set `engine: "operator"`. Diverge will create native `AtlasMigration` or `AtlasSchema` custom resources owned by the `Environment`:

```yaml
database:
  atlas:
    engine: operator
    mode: versioned
    migration_config_map: db-migrations
```

The Diverge reconciler monitors the `Ready` condition on the generated Atlas custom resource and updates `DatabaseReady` accordingly.

---

## Security & Scoping

Diverge automatically generates ephemeral credentials and connection strings with schema scoping for each preview environment:

1. A unique preview schema (`preview_<env>`) and isolated per-schema database role (`diverge_preview_<schema>`) are created.
2. The `DATABASE_URL` is configured with `search_path=preview_<env>,public`, and Diverge revokes `CREATE` and write privileges (`INSERT, UPDATE, DELETE, TRUNCATE`) on `public` from the preview role (verifying zero effective `public` write/DDL privileges via `has_schema_privilege` and `has_table_privilege`).
3. If `spec.database.seedSource` is configured in `schema` mode (`public`, `schema:<name>`, or `configmap:<name>[/<key>]`), Diverge clones table structures/data (advancing copied identity/serial sequences) or executes ConfigMap seed SQL inside the preview schema during provisioning.
4. When `spec.database.connectionRef` is omitted in `schema` mode, the controller automatically creates an owned Kubernetes Secret named `diverge-db-env-<env>-<hash8>` containing both `DATABASE_URL` and `DIVERGE_PREVIEW_SCHEMA` (`preview_<env>`) and binds `spec.database.connectionRef` to it so Atlas migration Jobs and preview pods consume the isolated schema automatically.
5. When the preview environment is torn down, Diverge deletes the `diverge-db-env-<env>-<hash8>` Secret, drops the `preview_<env>` schema with `CASCADE`, and removes the `diverge_preview_<schema>` role.

---

## CloudNativePG (`cnpg` / `fresh` / `snapshot`) In-Cluster Branching

In addition to lightweight PostgreSQL schema isolation (`mode: schema`), Diverge includes a native **CloudNativePG** (`postgresql.cnpg.io/v1` `Cluster`) database provider (`internal/database/cnpg`) for full cluster-level isolation inside Kubernetes:

- **Fresh Cluster (`mode: fresh` or annotation `divergedev.com/database-provider: cnpg`)**: Provisions an ephemeral single-instance CloudNativePG `Cluster` (`diverge-pg-<env>`) bootstrapped via `initdb` (`database: app`, `owner: app`).
- **Cloned Snapshot Cluster (`mode: snapshot`)**: When `spec.database.seedSource` (or annotation `divergedev.com/cnpg-source-cluster` / `DIVERGE_CNPG_SOURCE_CLUSTER`) references an in-cluster baseline CNPG cluster, Diverge provisions `diverge-pg-<env>` using `pg_basebackup` streaming clone (automatically copying the source password Secret into the preview namespace when `deploy.namespace: create`), or via `recovery` when `divergedev.com/cnpg-bootstrap-mode: recovery` and an object-store backup path (`divergedev.com/cnpg-barman-destination-path`) are configured.
- **Automatic Secret Wiring & Teardown**: Once the CNPG `Cluster` reports healthy and its `<cluster>-app` credentials Secret is populated, Diverge injects `DATABASE_URL` and `DIVERGE_CNPG_CLUSTER` into `diverge-db-env-<env>`, records `status.databaseProvider`, and automatically deletes the `Cluster` when the preview `Environment` is torn down.

