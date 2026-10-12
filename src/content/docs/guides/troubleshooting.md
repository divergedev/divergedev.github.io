---
title: Troubleshooting & diverge doctor
description: Diagnose and fix common preview environment, routing, database migration, and AgentTask issues using diverge doctor.
---

Use `diverge doctor` (or the `diverge_doctor` MCP tool) as your first step whenever an environment or sandbox fails to reconcile.

```bash
diverge doctor
```

---

## Common Issues & Fixes

### 1. `Environment` Stuck in `Pending` or `Deploying`

**Symptoms**: `kubectl get env` shows `Phase: Deploying` or `Phase: Migrating` for > 2 minutes.

**Diagnosis**:
```bash
diverge status <env-name>
diverge logs <env-name>
```
Or via MCP: invoke `diverge_fetch_errors` and `diverge_list_hook_jobs`.

**Common Causes**:
- **Database Migration Job Failed**: Run `diverge_list_hook_jobs` or `kubectl get jobs -n <namespace> -l divergedev.com/environment=<env-name>`. Fix the SQL migration or re-trigger via `diverge_retry_hook`.
- **ImagePullBackOff**: Verify your cluster nodes have pull credentials (`imagePullSecrets`) for your PR container image tag.

---

### 2. Requests Hit Baseline Production Instead of Preview Pod

**Symptoms**: Sending `curl -H "x-preview-env: pr-42"` returns responses from the baseline service.

**Diagnosis**:
```bash
diverge route <service-name>
```

**Common Causes**:
- **Header Name Mismatch**: Check that the `routing.headerKey` on your `PreviewGroup` / `Environment` (e.g., `x-preview-env` or `x-diverge-env`) matches the header sent by your client and propagated by intermediate services.
- **Downstream Service Dropped Header**: An upstream service called a downstream service without forwarding the preview header. Ensure your service uses the Diverge SDK interceptors or forwards the routing header.
- **Missing GatewayClass**: Run `kubectl get gatewayclass` and verify the `Gateway` referenced by `--gateway-name` is `Programmed: True`.

---

### 3. `AgentTask` Returns `401 Unauthenticated` or `429 Too Many Requests` When Calling `diverge-server`

**Symptoms**:
- Sandbox agent logs show `unauthenticated: token has been revoked` or `invalid macaroon signature` (`401 Unauthenticated`).
- Live LLM metering calls to `POST /api/v1/agenttask/meter` return `429 Too Many Requests` (`{"suspended": true}`) and the task stops executing.

**Common Causes**:
- **Task Paused or Budget Exceeded (`429 Too Many Requests` / `401 Unauthenticated`)**: Check `kubectl get agenttask <name> -o yaml`. When an agent reports token or USD usage to `POST /api/v1/agenttask/meter` that exceeds `budgetUSD`, `budgetTokens`, `maxIterations`, or its Macaroon `max_cost_usd` / `max_tokens` caveats, `diverge-server` automatically sets `spec.suspended: true`, transitions `status.phase` to `Paused` (`Reason: BudgetExceeded`), marks the token `"revoked"` in `diverge-agenttask-tokens`, and returns `429 Too Many Requests`. To resume, increase the budget and set `spec.suspended: false` (or comment `/diverge resume` on the PR/MR) so the controller mints a fresh Macaroon capability token.
- **Mismatched `DIVERGE_MACAROON_ROOT_KEY`**: Ensure `sandbox.macaroonSecretRef.name` in Helm is mounted into both `diverge-controller` and `diverge-server`.

---

### 4. `Environment` or `PreviewGroup` Stuck in `Terminating`

**Symptoms**: `kubectl delete env <name>` hangs.

**Common Causes**:
- **Database Provider Teardown Blocked**: If the backing Postgres server is unreachable during schema drop, the controller retries teardown before removing `divergedev.com/finalizer`. Check controller logs:
  ```bash
  kubectl logs -n diverge-system deployment/diverge-controller-manager --tail=100
  ```
