---
title: Interactive Architecture & Dashboard Tour
description: Experience Diverge in your browser — simulate delta deployments, ?_diverge_env cookie routing, scale-to-zero wake-up splash pages, autonomous AgentTask Macaroon metering, and diverge doctor diagnostics without spinning up a cluster.
---

Experience how Diverge orchestrates delta deployments, header/cookie routing, database schema isolation, serverless scale-to-zero hibernation, autonomous `AgentTask` Macaroon sandboxes, and `diverge doctor` diagnostics right in your browser—before installing a single CRD.

:::tip[Want to run this exact stack on a real cluster?]
Every step in this interactive tour mirrors the [**Full-Stack Demo Monorepo (`examples/fullstack-demo/`)**](/guides/fullstack-demo/), which you can spin up locally in one command (`./examples/fullstack-demo/scripts/run-demo.sh`) on `kind` or `k3d`.
:::

---

## Interactive 6-Step Sandbox Walkthrough

Use the step buttons below (or press <kbd>←</kbd> / <kbd>→</kbd> when focused inside the tour) to step through the lifecycle of **PR #42 (`feat/instant-payouts`)** on a 3-service e-commerce stack (`storefront-web`, `checkout-api`, `fulfillment-worker`).

<div class="dv-tour-shell" id="dv-interactive-tour" tabindex="0" aria-label="Interactive Diverge Architecture Tour">
  <div class="dv-tour-topbar">
    <div class="dv-tour-brand">
      <span class="dv-tour-live-dot"></span>
      <span class="dv-tour-brand-title">Diverge Control Plane Simulator</span>
      <span class="dv-tour-cluster-pill" id="dv-cluster-summary">Namespace: <code>demo-staging</code> · 3 Baseline Pods · 0 Preview Pods</span>
    </div>
    <div class="dv-tour-nav-btns">
      <button type="button" class="dv-btn dv-btn-ghost" id="dv-prev-btn" aria-label="Previous step">← Prev</button>
      <span class="dv-step-counter" id="dv-step-counter">Step 1 of 6</span>
      <button type="button" class="dv-btn dv-btn-primary" id="dv-next-btn" aria-label="Next step">Next Step →</button>
    </div>
  </div>

  <div class="dv-step-tabs" role="tablist" aria-label="Tour steps">
    <button type="button" role="tab" class="dv-step-tab active" data-step="1" aria-selected="true">
      <span class="dv-step-num">1</span>
      <span class="dv-step-label">Baseline Cluster</span>
    </button>
    <button type="button" role="tab" class="dv-step-tab" data-step="2" aria-selected="false">
      <span class="dv-step-num">2</span>
      <span class="dv-step-label">Open PR #42 (Delta)</span>
    </button>
    <button type="button" role="tab" class="dv-step-tab" data-step="3" aria-selected="false">
      <span class="dv-step-num">3</span>
      <span class="dv-step-label">Cookie &amp; L7 Routing</span>
    </button>
    <button type="button" role="tab" class="dv-step-tab" data-step="4" aria-selected="false">
      <span class="dv-step-num">4</span>
      <span class="dv-step-label">Scale-to-Zero Splash</span>
    </button>
    <button type="button" role="tab" class="dv-step-tab" data-step="5" aria-selected="false">
      <span class="dv-step-num">5</span>
      <span class="dv-step-label">AgentTask &amp; Macaroon</span>
    </button>
    <button type="button" role="tab" class="dv-step-tab" data-step="6" aria-selected="false">
      <span class="dv-step-num">6</span>
      <span class="dv-step-label">Doctor &amp; Teardown</span>
    </button>
  </div>

  <div class="dv-progress-track" aria-hidden="true">
    <div class="dv-progress-fill" id="dv-progress-fill" style="transform: scaleX(0.1667);"></div>
  </div>

  <!-- STEP 1: SHARED BASELINE CLUSTER -->
  <section class="dv-step-pane active" data-pane="1" aria-labelledby="dv-pane-title-1">
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 1 · Shared Baseline Stack (0 Open PRs)</span>
        <h3 class="dv-pane-title" id="dv-pane-title-1">Your Staging Cluster Before Any Pull Requests Open</h3>
        <p class="dv-pane-desc">Three microservices run in <code>demo-staging</code> alongside shared PostgreSQL, Kafka, and Flipt feature flags. All traffic flows through <code>diverge-proxy</code> to baseline <code>v1.4.0</code> pods.</p>
      </div>
      <button type="button" class="dv-btn dv-btn-accent" id="dv-btn-baseline-req">Send Live Request (<code>GET /api/checkout</code>)</button>
    </div>

    <div class="dv-topo-grid">
      <div class="dv-node dv-node-proxy" id="dv-s1-proxy">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-orange">Ingress / L7 Router</span>
          <code>diverge-proxy</code>
        </div>
        <div class="dv-node-meta">Header &amp; <code>?_diverge_env</code> cookie aware</div>
      </div>

      <div class="dv-node" id="dv-s1-web">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-green">Baseline 1/1</span>
          <code>storefront-web</code>
        </div>
        <div class="dv-node-meta">Image: <code>v1.4.0</code> · Next.js / Go BFF</div>
      </div>

      <div class="dv-node" id="dv-s1-api">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-green">Baseline 1/1</span>
          <code>checkout-api</code>
        </div>
        <div class="dv-node-meta">Image: <code>v1.4.0</code> · Propagates <code>x-diverge-env</code></div>
      </div>

      <div class="dv-node" id="dv-s1-worker">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-green">Baseline 1/1</span>
          <code>fulfillment-worker</code>
        </div>
        <div class="dv-node-meta">Image: <code>v1.4.0</code> · Topic: <code>orders.events</code></div>
      </div>

      <div class="dv-node" id="dv-s1-pg">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-blue">PostgreSQL 16</span>
          <code>schema: public</code>
        </div>
        <div class="dv-node-meta">Table: <code>orders</code> (4 baseline rows)</div>
      </div>

      <div class="dv-node" id="dv-s1-flipt">
        <div class="dv-node-head">
          <span class="dv-badge dv-badge-purple">OpenFeature / Flipt</span>
          <code>namespace: default</code>
        </div>
        <div class="dv-node-meta">Flag: <code>instant_payouts = false</code></div>
      </div>
    </div>

    <div class="dv-console" id="dv-s1-console">
      <div class="dv-console-bar">
        <span>HTTP Trace &amp; JSON Response</span>
        <code id="dv-s1-status">200 OK · 14ms · Baseline Route</code>
      </div>
      <pre class="dv-console-pre" id="dv-s1-output">$ curl -s https://shop.preview.example.com/api/checkout | jq .
{
  "service": "checkout-api",
  "version": "v1.4.0",
  "environment": "baseline (demo-staging)",
  "db_schema": "public",
  "feature_flags": {
    "instant_payouts": false
  },
  "settlement_eta": "T+2 business days"
}</pre>
    </div>
  </section>

  <!-- STEP 2: OPEN PR #42 DELTA DEPLOY -->
  <section class="dv-step-pane" data-pane="2" aria-labelledby="dv-pane-title-2" hidden>
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 2 · Open PR #42 (<code>feat/instant-payouts</code>)</span>
        <h3 class="dv-pane-title" id="dv-pane-title-2">Delta Analysis, Isolated Postgres Schema &amp; Flipt Flag</h3>
        <p class="dv-pane-desc">PR #42 modifies <code>services/checkout-api/main.go</code> and adds <code>migrations/20260902_add_instant_payouts.sql</code>. Diverge deploys <strong>only 1 delta pod</strong> instead of cloning all 3 services.</p>
      </div>
      <button type="button" class="dv-btn dv-btn-accent" id="dv-btn-trigger-pr42">Re-Run <code>diverge diff &amp; preview up</code></button>
    </div>

    <div class="dv-split-2">
      <div class="dv-console">
        <div class="dv-console-bar">
          <span>CLI Diff &amp; Controller Reconciliation</span>
          <code>67% Compute Saved</code>
        </div>
        <pre class="dv-console-pre" id="dv-s2-cli">$ diverge diff --base origin/main --head feat/instant-payouts
Changed files (2):
  M services/checkout-api/main.go
  A services/checkout-api/migrations/20260902_add_instant_payouts.sql

Impact Matrix:
  [SKIP] storefront-web      (0 files changed -> reuse baseline v1.4.0)
  [DEPLOY] checkout-api      (2 files changed -> build tag pr-42-9f3a1c)
  [SKIP] fulfillment-worker  (0 files changed -> reuse baseline v1.4.0)

Reconciling PreviewGroup/pr-42:
  ✓ Secret/diverge-db-env-pr-42 created (schema: preview_pr_42)
  ✓ Job/atlas-migrate-pr-42 succeeded (applied 20260902_add_instant_payouts.sql)
  ✓ Flipt namespace "preview-pr-42" synced (instant_payouts = true)
  ✓ Deployment/checkout-api-pr-42 Ready (1/1 pods · $0.012/hr)
  ✓ HTTPRoute/checkout-api-pr-42 programmed (x-diverge-env: pr-42)</pre>
      </div>

      <div class="dv-delta-cards">
        <div class="dv-delta-card dv-delta-reused">
          <div class="dv-delta-row">
            <strong><code>storefront-web</code></strong>
            <span class="dv-badge dv-badge-gray">Reused from Baseline (0 extra pods)</span>
          </div>
          <p>Forwards incoming <code>x-diverge-env: pr-42</code> header to downstream <code>checkout-api</code>.</p>
        </div>

        <div class="dv-delta-card dv-delta-deployed" id="dv-s2-delta-card">
          <div class="dv-delta-row">
            <strong><code>checkout-api-pr-42</code></strong>
            <span class="dv-badge dv-badge-orange">Delta Deployed (1 pod · $0.012/hr)</span>
          </div>
          <p>Injected with <code>DIVERGE_PREVIEW_SCHEMA=preview_pr_42</code> and Flipt namespace <code>preview-pr-42</code>.</p>
        </div>

        <div class="dv-delta-card dv-delta-reused">
          <div class="dv-delta-row">
            <strong><code>fulfillment-worker</code></strong>
            <span class="dv-badge dv-badge-gray">Reused + Ephemeral Topic <code>pr-42.orders.events</code></span>
          </div>
          <p>Zero duplicate worker pods needed unless worker code changes in the PR.</p>
        </div>

        <div class="dv-delta-card dv-delta-db">
          <div class="dv-delta-row">
            <strong>Postgres Schema <code>preview_pr_42</code> + Atlas</strong>
            <span class="dv-badge dv-badge-blue">Isolated DDL</span>
          </div>
          <p><code>ALTER TABLE preview_pr_42.orders ADD COLUMN payout_rail TEXT DEFAULT 'RTP_INSTANT';</code></p>
        </div>
      </div>
    </div>
  </section>

  <!-- STEP 3: COOKIE SWITCHER & L7 ROUTING -->
  <section class="dv-step-pane" data-pane="3" aria-labelledby="dv-pane-title-3" hidden>
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 3 · Zero-Extension Browser Testing</span>
        <h3 class="dv-pane-title" id="dv-pane-title-3">One-Click <code>?_diverge_env=pr-42</code> Cookie Switcher &amp; L7 Header Propagation</h3>
        <p class="dv-pane-desc">Click any URL pill below to simulate how a PM, designer, or QA engineer switches between baseline and PR #42 in their browser without installing extensions or changing DNS.</p>
      </div>
    </div>

    <div class="dv-url-pills" role="group" aria-label="Simulated Browser URL Switcher">
      <button type="button" class="dv-url-pill" data-url-mode="baseline">
        <span class="dv-pill-tag">Baseline</span>
        <code>https://shop.preview.example.com/</code>
      </button>
      <button type="button" class="dv-url-pill active" data-url-mode="pr42">
        <span class="dv-pill-tag dv-pill-tag-accent">Activate PR #42</span>
        <code>https://shop.preview.example.com/?_diverge_env=pr-42</code>
      </button>
      <button type="button" class="dv-url-pill" data-url-mode="clear">
        <span class="dv-pill-tag">Clear Cookie</span>
        <code>https://shop.preview.example.com/?_diverge_env=clear</code>
      </button>
    </div>

    <div class="dv-browser-window">
      <div class="dv-browser-chrome">
        <div class="dv-browser-dots"><span></span><span></span><span></span></div>
        <div class="dv-browser-addr" id="dv-s3-address">https://shop.preview.example.com/?_diverge_env=pr-42</div>
        <div class="dv-browser-cookie" id="dv-s3-cookie-badge">Cookie: <code>_diverge_env=pr-42</code></div>
      </div>

      <div class="dv-browser-body">
        <div class="dv-shop-card">
          <div class="dv-shop-header">
            <div>
              <span class="dv-shop-eyebrow">Acme Merchant Storefront (<code>storefront-web:v1.4.0</code>)</span>
              <h4 class="dv-shop-title" id="dv-s3-shop-title">Instant Payouts Checkout Preview</h4>
            </div>
            <span class="dv-badge dv-badge-orange" id="dv-s3-flag-pill">Flipt: instant_payouts = true</span>
          </div>

          <div class="dv-shop-grid">
            <div class="dv-shop-stat">
              <span class="dv-shop-stat-label">Backend Responder</span>
              <strong id="dv-s3-responder"><code>checkout-api-pr-42</code> (PR #42 Delta Pod)</strong>
            </div>
            <div class="dv-shop-stat">
              <span class="dv-shop-stat-label">PostgreSQL Schema</span>
              <strong id="dv-s3-schema"><code>preview_pr_42</code> (<code>payout_rail: RTP_INSTANT</code>)</strong>
            </div>
            <div class="dv-shop-stat">
              <span class="dv-shop-stat-label">Settlement Speed</span>
              <strong id="dv-s3-eta">Instant (&lt; 4 seconds via FedNow / RTP)</strong>
            </div>
          </div>

          <div class="dv-trace-strip" id="dv-s3-trace">
            <code>Browser</code> → <code>diverge-proxy (Set-Cookie: _diverge_env=pr-42)</code> → <code>storefront-web [baseline]</code> → <code>[x-diverge-env: pr-42]</code> → <strong class="dv-trace-highlight">checkout-api-pr-42 [delta]</strong> → <code>PG [preview_pr_42]</code>
          </div>
        </div>

        <div class="dv-preview-banner" id="dv-s3-banner">
          <div>
            <strong>⚡ Diverge Preview Environment:</strong> <code>pr-42</code> (Branch: <code>feat/instant-payouts</code> · Cost: <code>$0.012/hr</code>)
          </div>
          <button type="button" class="dv-banner-exit" id="dv-s3-banner-reset">Exit Preview (<code>?_diverge_env=clear</code>)</button>
        </div>
      </div>
    </div>
  </section>

  <!-- STEP 4: SCALE-TO-ZERO & WAKE-UP SPLASH -->
  <section class="dv-step-pane" data-pane="4" aria-labelledby="dv-pane-title-4" hidden>
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 4 · Idle Hibernation &amp; Cold-Start Activator</span>
        <h3 class="dv-pane-title" id="dv-pane-title-4">Scale-to-Zero (<code>0/0</code> Pods) &amp; <code>202 Accepted</code> Wake-Up Splash</h3>
        <p class="dv-pane-desc">After 30 minutes without traffic (<code>divergedev.com/hibernate-after: "30m"</code>), Diverge scales <code>checkout-api-pr-42</code> to <code>0</code> replicas (`$0.00/hr`). Click below to send a browser request and watch <code>activator-proxy --wake-splash</code> wake the pod.</p>
      </div>
      <div class="dv-btn-group">
        <button type="button" class="dv-btn dv-btn-ghost" id="dv-btn-hibernate">Hibernate Now (<code>0/0</code>)</button>
        <button type="button" class="dv-btn dv-btn-accent" id="dv-btn-wake">Wake Hibernated Preview (<code>GET /</code>)</button>
      </div>
    </div>

    <div class="dv-split-2">
      <div class="dv-s2z-viewport" id="dv-s4-viewport">
        <div class="dv-s2z-badge-row">
          <span class="dv-badge dv-badge-orange" id="dv-s4-http-badge">HTTP 202 Accepted · Wake Splash Active</span>
          <code id="dv-s4-replicas">Deployment/checkout-api-pr-42: 0/1 Ready ($0.000/hr)</code>
        </div>

        <div class="dv-splash-box" id="dv-s4-splash-box">
          <div class="dv-splash-spinner" id="dv-s4-spinner" aria-hidden="true"></div>
          <h4 class="dv-splash-title" id="dv-s4-title">Waking Preview Environment <code>pr-42</code>…</h4>
          <p class="dv-splash-sub" id="dv-s4-sub"><code>activator-proxy</code> triggered scale-up from <code>0 → 1</code> replica and is polling <code>GET /-/wakeup-status?env=pr-42</code> every 1.5s.</p>
          <div class="dv-splash-steps">
            <div class="dv-splash-step done" id="dv-s4-st1">1. Intercepted browser <code>GET /</code> with <code>Accept: text/html</code></div>
            <div class="dv-splash-step active" id="dv-s4-st2">2. Patched <code>Deployment/checkout-api-pr-42</code> replicas <code>0 → 1</code></div>
            <div class="dv-splash-step" id="dv-s4-st3">3. Pod readiness probe passed — auto-reloading storefront (`200 OK`)</div>
          </div>
        </div>
      </div>

      <div class="dv-console">
        <div class="dv-console-bar">
          <span>Activator Proxy &amp; Wakeup Status Log</span>
          <code id="dv-s4-timer">Cold start: ~2.4s</code>
        </div>
        <pre class="dv-console-pre" id="dv-s4-log">[21:00:00Z] hibernate-controller: env "pr-42" idle for 30m0s -> scaled checkout-api-pr-42 to 0 replicas
[21:00:00Z] metrics: diverge_environment_estimated_hourly_cost_usd{environment="pr-42"} 0.000

# Click "Wake Hibernated Preview (GET /)" above to trigger cold-start wake-up...</pre>
      </div>
    </div>
  </section>

  <!-- STEP 5: AUTONOMOUS AGENTTASK & MACAROON METERING -->
  <section class="dv-step-pane" data-pane="5" aria-labelledby="dv-pane-title-5" hidden>
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 5 · Autonomous AI Coding Sandbox</span>
        <h3 class="dv-pane-title" id="dv-pane-title-5"><code>AgentTask</code> in gVisor + Live Macaroon LLM Budget Enforcement</h3>
        <p class="dv-pane-desc">A reviewer comments <code>/diverge fix "Fix currency rounding in instant payouts"</code> on PR #42. Diverge spawns an isolated <code>gvisor</code> sandbox with a cryptographic HMAC-SHA256 Macaroon token capped at <strong><code>$5.00</code></strong> and restricted to <code>claude-3-7-sonnet</code>.</p>
      </div>
    </div>

    <div class="dv-split-2">
      <div class="dv-agent-panel">
        <div class="dv-agent-header">
          <div>
            <span class="dv-badge dv-badge-green" id="dv-s5-phase-badge">Phase: Running (gVisor)</span>
            <h4 class="dv-agent-title"><code>AgentTask/fix-pr-42-rounding</code></h4>
          </div>
          <code class="dv-token-status" id="dv-s5-token-badge">Macaroon: ACTIVE</code>
        </div>

        <div class="dv-caveat-list">
          <div class="dv-caveat"><code>task_id = fix-pr-42-rounding</code></div>
          <div class="dv-caveat"><code>max_cost_usd = 5.00</code></div>
          <div class="dv-caveat"><code>max_tokens = 200000</code></div>
          <div class="dv-caveat"><code>allowed_models = claude-3-7-sonnet</code></div>
          <div class="dv-caveat"><code>linked_preview = agent-preview-fix-pr-42</code></div>
        </div>

        <div class="dv-meter-box">
          <div class="dv-meter-labels">
            <span>Live LLM Spend (<code>status.costUSD</code> / <code>$5.00</code> Cap)</span>
            <strong id="dv-s5-spend-label">$1.25 / $5.00 (42,000 tokens)</strong>
          </div>
          <div class="dv-meter-bar">
            <div class="dv-meter-fill" id="dv-s5-meter-fill" style="transform: scaleX(0.25);"></div>
          </div>
        </div>

        <div class="dv-agent-controls">
          <label class="dv-model-select-wrap" for="dv-s5-model">
            <span>Model in Request:</span>
            <select id="dv-s5-model" class="dv-select">
              <option value="claude-3-7-sonnet">claude-3-7-sonnet (Allowed)</option>
              <option value="gpt-4o">gpt-4o (Disallowed by Caveat)</option>
            </select>
          </label>
          <button type="button" class="dv-btn dv-btn-accent" id="dv-btn-meter-call">Simulate Agent LLM Call (<code>+$1.35</code>)</button>
          <button type="button" class="dv-btn dv-btn-ghost" id="dv-btn-agent-resume">Resume Task (<code>+$5.00 Budget</code>)</button>
        </div>
      </div>

      <div class="dv-console">
        <div class="dv-console-bar">
          <span><code>POST /api/v1/agenttask/meter</code> Response</span>
          <code id="dv-s5-http-code">HTTP 200 OK</code>
        </div>
        <pre class="dv-console-pre" id="dv-s5-console">$ curl -X POST https://diverge-server.diverge-system.svc:8080/api/v1/agenttask/meter \
  -H "Authorization: Bearer MDAxZWxvY2F0aW9uIGRpdmVyZ2Utc2VydmVy..." \
  -d '{"model":"claude-3-7-sonnet","tokensUsed":42000,"costUSD":1.25,"iteration":1}'

HTTP/1.1 200 OK
{
  "allowed": true,
  "suspended": false,
  "task": "fix-pr-42-rounding",
  "costUSD": 1.25,
  "budgetUSD": 5.00,
  "tokensUsed": 42000,
  "remainingUSD": 3.75
}</pre>
      </div>
    </div>
  </section>

  <!-- STEP 6: DIVERGE DOCTOR & FINALIZER TEARDOWN -->
  <section class="dv-step-pane" data-pane="6" aria-labelledby="dv-pane-title-6" hidden>
    <div class="dv-pane-header">
      <div>
        <span class="dv-pane-kicker">Step 6 · Structured Diagnostics &amp; Zero-Orphan Cleanup</span>
        <h3 class="dv-pane-title" id="dv-pane-title-6"><code>diverge doctor</code> Fault Simulator (<code>DIV-101</code>–<code>DIV-110</code>) &amp; PR Merge Teardown</h3>
        <p class="dv-pane-desc">Inject a realistic failure below to inspect the exact <code>diverge doctor</code> diagnostic code and remediation output, or merge PR #42 to watch finalizer cleanup tear down every ephemeral resource.</p>
      </div>
      <button type="button" class="dv-btn dv-btn-accent" id="dv-btn-merge-pr">Merge PR #42 &amp; Run Finalizer Teardown</button>
    </div>

    <div class="dv-url-pills" role="group" aria-label="diverge doctor fault injector">
      <button type="button" class="dv-url-pill active" data-doc-mode="healthy">
        <span class="dv-pill-tag">Healthy</span>
        <code>All Checks Passing</code>
      </button>
      <button type="button" class="dv-url-pill" data-doc-mode="div102">
        <span class="dv-pill-tag dv-pill-tag-warn">Inject DIV-102</span>
        <code>Atlas Migration Failed</code>
      </button>
      <button type="button" class="dv-url-pill" data-doc-mode="div105">
        <span class="dv-pill-tag dv-pill-tag-warn">Inject DIV-105</span>
        <code>Pod CrashLoopBackOff</code>
      </button>
      <button type="button" class="dv-url-pill" data-doc-mode="div110">
        <span class="dv-pill-tag dv-pill-tag-warn">Inject DIV-110</span>
        <code>AgentTask BudgetExceeded</code>
      </button>
    </div>

    <div class="dv-console">
      <div class="dv-console-bar">
        <span><code>diverge doctor --namespace demo-staging</code></span>
        <a href="/guides/troubleshooting/#diagnostic-error-codes-div-101--div-110" class="dv-doc-link" id="dv-s6-doc-link">View DIV-101–DIV-110 Playbook →</a>
      </div>
      <pre class="dv-console-pre" id="dv-s6-output">$ diverge doctor --namespace demo-staging
✓ Kubernetes API &amp; Diverge CRDs (Environment, PreviewGroup, AgentTask) healthy
✓ PreviewGroup/pr-42 [Phase: Ready] (1 delta service: checkout-api-pr-42)
✓ Database Schema "preview_pr_42" &amp; Secret/diverge-db-env-pr-42 synced
✓ HTTPRoute/checkout-api-pr-42 Programmed=True (header: x-diverge-env=pr-42)
✓ AgentTask/fix-pr-42-rounding [Phase: Succeeded] ($3.80 / $5.00 budget)

No issues found (0 critical, 0 warnings).</pre>
    </div>
  </section>
</div>

<style>
  .dv-tour-shell {
    background: var(--sl-color-bg-nav, rgba(14, 16, 22, 0.92));
    border: 1px solid var(--sl-color-hairline-light, rgba(255, 255, 255, 0.12));
    border-radius: 16px;
    padding: 1.35rem;
    margin: 1.75rem 0 2.75rem 0;
    box-shadow:
      inset 0 1px 0 0 rgba(255, 255, 255, 0.06),
      0 16px 40px -8px rgba(0, 0, 0, 0.55);
    color: var(--sl-color-text, #e2e8f0);
    outline: none;
  }

  .dv-tour-shell:focus-visible {
    border-color: var(--sl-color-accent, #ff5500);
    box-shadow: 0 0 0 2px rgba(255, 85, 0, 0.35);
  }

  .dv-tour-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--sl-color-hairline, rgba(255, 255, 255, 0.08));
  }

  .dv-tour-brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
  }

  .dv-tour-live-dot {
    width: 9px;
    height: 9px;
    border-radius: 9999px;
    background: #22c55e;
    box-shadow: 0 0 10px #22c55e;
    display: inline-block;
  }

  .dv-tour-brand-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--sl-color-white, #ffffff);
  }

  .dv-tour-cluster-pill {
    font-size: 0.78rem;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--sl-color-hairline, rgba(255, 255, 255, 0.08));
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-tour-nav-btns {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .dv-step-counter {
    font-family: var(--sl-font-mono, monospace);
    font-size: 0.8rem;
    color: var(--sl-color-gray-3, #94a3b8);
    padding: 0 0.25rem;
  }

  .dv-btn {
    cursor: pointer;
    font-family: var(--sl-font, sans-serif);
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.85rem;
    border-radius: 8px;
    border: 1px solid var(--sl-color-hairline-light, rgba(255, 255, 255, 0.14));
    transition: transform 0.16s ease, opacity 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
    margin: 0;
  }

  .dv-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .dv-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dv-btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    color: var(--sl-color-gray-2, #cbd5e1);
  }

  .dv-btn-primary {
    background: rgba(255, 85, 0, 0.18);
    border-color: rgba(255, 85, 0, 0.45);
    color: var(--sl-color-white, #ffffff);
  }

  .dv-btn-accent {
    background: linear-gradient(180deg, #ff6a1a 0%, #ee4400 100%);
    border-color: rgba(255, 85, 0, 0.7);
    color: #ffffff;
    box-shadow: 0 6px 18px -4px rgba(255, 85, 0, 0.45);
  }

  .dv-btn-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dv-step-tabs {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 0.45rem;
    margin-top: 0.9rem;
  }

  @media (max-width: 900px) {
    .dv-step-tabs {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 520px) {
    .dv-step-tabs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .dv-step-tab {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.5rem 0.65rem;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--sl-color-hairline, rgba(255, 255, 255, 0.07));
    color: var(--sl-color-gray-3, #94a3b8);
    cursor: pointer;
    text-align: left;
    font-size: 0.78rem;
    font-weight: 600;
    transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
    margin: 0;
  }

  .dv-step-tab:hover {
    border-color: rgba(255, 85, 0, 0.35);
    color: var(--sl-color-white, #ffffff);
  }

  .dv-step-tab.active {
    background: rgba(255, 85, 0, 0.14);
    border-color: var(--sl-color-accent, #ff5500);
    color: var(--sl-color-white, #ffffff);
  }

  .dv-step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    font-family: var(--sl-font-mono, monospace);
    font-size: 0.72rem;
    flex-shrink: 0;
  }

  .dv-step-tab.active .dv-step-num {
    background: var(--sl-color-accent, #ff5500);
    color: #ffffff;
  }

  .dv-progress-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 9999px;
    margin: 0.85rem 0 1.25rem 0;
    overflow: hidden;
  }

  .dv-progress-fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #ff5500, #ffa366);
    transform-origin: left center;
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .dv-step-pane {
    animation: dvFadeIn 0.22s ease-out;
  }

  @keyframes dvFadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dv-pane-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.15rem;
  }

  .dv-pane-kicker {
    display: inline-block;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--sl-color-accent-high, #ffa366);
    margin-bottom: 0.2rem;
  }

  .dv-pane-title {
    margin: 0 0 0.35rem 0 !important;
    font-size: 1.25rem !important;
    color: var(--sl-color-white, #ffffff) !important;
  }

  .dv-pane-desc {
    margin: 0 !important;
    font-size: 0.9rem;
    color: var(--sl-color-gray-3, #94a3b8);
    max-width: 52rem;
  }

  .dv-topo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .dv-node {
    padding: 0.85rem 0.95rem;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid var(--sl-color-hairline, rgba(255, 255, 255, 0.08));
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .dv-node.dv-pulse {
    border-color: var(--sl-color-accent, #ff5500);
    transform: translateY(-2px);
  }

  .dv-node-head {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    margin-bottom: 0.35rem;
  }

  .dv-node-meta {
    font-size: 0.78rem;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-badge {
    display: inline-block;
    width: fit-content;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.15rem 0.5rem;
    border-radius: 9999px;
  }

  .dv-badge-green {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.35);
  }

  .dv-badge-orange {
    background: rgba(255, 85, 0, 0.16);
    color: #ffa366;
    border: 1px solid rgba(255, 85, 0, 0.38);
  }

  .dv-badge-blue {
    background: rgba(56, 189, 248, 0.15);
    color: #7dd3fc;
    border: 1px solid rgba(56, 189, 248, 0.35);
  }

  .dv-badge-purple {
    background: rgba(168, 85, 247, 0.15);
    color: #d8b4fe;
    border: 1px solid rgba(168, 85, 247, 0.35);
  }

  .dv-badge-gray {
    background: rgba(148, 163, 184, 0.12);
    color: #cbd5e1;
    border: 1px solid rgba(148, 163, 184, 0.25);
  }

  .dv-badge-red {
    background: rgba(239, 68, 68, 0.16);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.38);
  }

  .dv-console {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--sl-color-hairline-light, rgba(255, 255, 255, 0.1));
    background: #090b10;
  }

  .dv-console-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.55rem 0.9rem;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    font-size: 0.78rem;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-console-pre {
    margin: 0 !important;
    border: none !important;
    border-radius: 0 !important;
    padding: 0.95rem 1.05rem !important;
    font-size: 0.8rem !important;
    line-height: 1.5 !important;
    overflow-x: auto;
    color: #e2e8f0;
  }

  .dv-split-2 {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 1rem;
    align-items: stretch;
  }

  @media (max-width: 860px) {
    .dv-split-2 {
      grid-template-columns: 1fr;
    }
  }

  .dv-delta-cards {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .dv-delta-card {
    padding: 0.75rem 0.95rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dv-delta-card p {
    margin: 0.3rem 0 0 0 !important;
    font-size: 0.8rem;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-delta-deployed {
    background: rgba(255, 85, 0, 0.08);
    border-color: rgba(255, 85, 0, 0.38);
  }

  .dv-delta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dv-url-pills {
    display: flex;
    gap: 0.55rem;
    flex-wrap: wrap;
    margin-bottom: 0.95rem;
  }

  .dv-url-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.45rem 0.75rem;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--sl-color-gray-2, #cbd5e1);
    cursor: pointer;
    font-size: 0.8rem;
    transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
    margin: 0;
  }

  .dv-url-pill.active {
    background: rgba(255, 85, 0, 0.13);
    border-color: var(--sl-color-accent, #ff5500);
    color: #ffffff;
  }

  .dv-pill-tag {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.12rem 0.45rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
  }

  .dv-pill-tag-accent {
    background: rgba(255, 85, 0, 0.25);
    color: #ffa366;
  }

  .dv-pill-tag-warn {
    background: rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }

  .dv-browser-window {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: #0c0e14;
    overflow: hidden;
  }

  .dv-browser-chrome {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }

  .dv-browser-dots {
    display: inline-flex;
    gap: 0.35rem;
  }

  .dv-browser-dots span {
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.2);
  }

  .dv-browser-addr {
    flex: 1;
    min-width: 220px;
    font-family: var(--sl-font-mono, monospace);
    font-size: 0.8rem;
    padding: 0.3rem 0.65rem;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.45);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #f8fafc;
  }

  .dv-browser-cookie {
    font-size: 0.76rem;
    color: var(--sl-color-accent-high, #ffa366);
  }

  .dv-browser-body {
    padding: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .dv-shop-card {
    padding: 1rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dv-shop-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    flex-wrap: wrap;
    margin-bottom: 0.85rem;
  }

  .dv-shop-eyebrow {
    font-size: 0.74rem;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-shop-title {
    margin: 0.15rem 0 0 0 !important;
    font-size: 1.05rem !important;
    color: #ffffff !important;
  }

  .dv-shop-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.65rem;
    margin-bottom: 0.85rem;
  }

  .dv-shop-stat {
    padding: 0.6rem 0.75rem;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.82rem;
  }

  .dv-shop-stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-trace-strip {
    font-size: 0.78rem;
    padding: 0.55rem 0.75rem;
    border-radius: 8px;
    background: rgba(255, 85, 0, 0.07);
    border: 1px dashed rgba(255, 85, 0, 0.35);
    color: #e2e8f0;
  }

  .dv-trace-highlight {
    color: #ffa366;
  }

  .dv-preview-banner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.65rem 0.9rem;
    border-radius: 9px;
    background: linear-gradient(90deg, rgba(255, 85, 0, 0.22), rgba(255, 122, 41, 0.1));
    border: 1px solid var(--sl-color-accent, #ff5500);
    font-size: 0.8rem;
  }

  .dv-banner-exit {
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.28rem 0.6rem;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.45);
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .dv-s2z-viewport,
  .dv-agent-panel {
    padding: 1rem;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.09);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.85rem;
  }

  .dv-s2z-badge-row,
  .dv-agent-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dv-splash-box {
    padding: 1rem;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .dv-splash-title,
  .dv-agent-title {
    margin: 0.25rem 0 !important;
    font-size: 1.05rem !important;
    color: #ffffff !important;
  }

  .dv-splash-sub {
    margin: 0 0 0.75rem 0 !important;
    font-size: 0.8rem;
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-splash-steps {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.78rem;
  }

  .dv-splash-step {
    padding: 0.4rem 0.65rem;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    color: var(--sl-color-gray-3, #94a3b8);
  }

  .dv-splash-step.done {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.1);
  }

  .dv-splash-step.active {
    color: #ffa366;
    background: rgba(255, 85, 0, 0.12);
    border: 1px solid rgba(255, 85, 0, 0.3);
  }

  .dv-caveat-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .dv-caveat {
    font-size: 0.74rem;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .dv-meter-box {
    padding: 0.75rem;
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.07);
  }

  .dv-meter-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    margin-bottom: 0.45rem;
  }

  .dv-meter-bar {
    height: 8px;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.08);
    overflow: hidden;
  }

  .dv-meter-fill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, #22c55e, #ff5500);
    transform-origin: left center;
    transition: transform 0.22s ease;
  }

  .dv-agent-controls {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .dv-model-select-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
  }

  .dv-select {
    background: #090b10;
    color: #ffffff;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    font-size: 0.78rem;
  }

  .dv-doc-link {
    color: #ffa366 !important;
    font-weight: 600;
    text-decoration: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .dv-step-pane,
    .dv-progress-fill,
    .dv-meter-fill,
    .dv-btn,
    .dv-step-tab,
    .dv-node {
      animation: none !important;
      transition: none !important;
    }
  }
</style>

<script>
  (function () {
    const shell = document.getElementById('dv-interactive-tour');
    if (!shell) return;

    const tabs = Array.from(shell.querySelectorAll('.dv-step-tab'));
    const panes = Array.from(shell.querySelectorAll('.dv-step-pane'));
    const prevBtn = document.getElementById('dv-prev-btn');
    const nextBtn = document.getElementById('dv-next-btn');
    const counter = document.getElementById('dv-step-counter');
    const progressFill = document.getElementById('dv-progress-fill');
    const clusterSummary = document.getElementById('dv-cluster-summary');

    let currentStep = 1;
    const totalSteps = 6;
    const summaries = {
      1: 'Namespace: <code>demo-staging</code> · 3 Baseline Pods · 0 Preview Pods ($0.000/hr preview overhead)',
      2: 'Namespace: <code>demo-staging</code> · 3 Baseline Pods · 1 Delta Pod (<code>checkout-api-pr-42</code> · $0.012/hr)',
      3: 'Routing: <code>?_diverge_env=pr-42</code> Cookie + <code>x-diverge-env: pr-42</code> Header Active',
      4: 'Scale-to-Zero: <code>checkout-api-pr-42</code> Hibernated (0/0 Pods · $0.000/hr)',
      5: 'Sandbox: <code>AgentTask/fix-pr-42-rounding</code> (gVisor + Macaroon $5.00 Cap)',
      6: 'Diagnostics: <code>diverge doctor</code> Healthy · Ready for Merge Teardown',
    };

    function applyStepDOM(step) {
      currentStep = Math.max(1, Math.min(totalSteps, step));
      tabs.forEach(function (t) {
        const isMatch = parseInt(t.getAttribute('data-step'), 10) === currentStep;
        t.classList.toggle('active', isMatch);
        t.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });
      panes.forEach(function (p) {
        const isMatch = parseInt(p.getAttribute('data-pane'), 10) === currentStep;
        p.classList.toggle('active', isMatch);
        p.hidden = !isMatch;
      });
      prevBtn.disabled = currentStep === 1;
      nextBtn.disabled = currentStep === totalSteps;
      counter.textContent = 'Step ' + currentStep + ' of ' + totalSteps;
      progressFill.style.transform = 'scaleX(' + (currentStep / totalSteps).toFixed(4) + ')';
      clusterSummary.innerHTML = summaries[currentStep];
    }

    function setStep(step) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && document.startViewTransition) {
        document.startViewTransition(function () {
          applyStepDOM(step);
        });
      } else {
        applyStepDOM(step);
      }
    }

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        setStep(parseInt(t.getAttribute('data-step'), 10));
      });
    });

    prevBtn.addEventListener('click', function () {
      if (currentStep > 1) setStep(currentStep - 1);
    });

    nextBtn.addEventListener('click', function () {
      if (currentStep < totalSteps) setStep(currentStep + 1);
    });

    shell.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT')) return;
      if (e.key === 'ArrowRight' && currentStep < totalSteps) {
        e.preventDefault();
        setStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft' && currentStep > 1) {
        e.preventDefault();
        setStep(currentStep - 1);
      }
    });

    // Step 1: Send Baseline Request
    let reqCount = 1;
    const btnBaselineReq = document.getElementById('dv-btn-baseline-req');
    if (btnBaselineReq) {
      btnBaselineReq.addEventListener('click', function () {
        reqCount += 1;
        const nodes = ['dv-s1-proxy', 'dv-s1-web', 'dv-s1-api', 'dv-s1-pg', 'dv-s1-flipt'];
        nodes.forEach(function (id) {
          const el = document.getElementById(id);
          if (el) {
            el.classList.add('dv-pulse');
            setTimeout(function () {
              el.classList.remove('dv-pulse');
            }, 500);
          }
        });
        document.getElementById('dv-s1-status').textContent =
          '200 OK · ' + (11 + (reqCount % 5)) + 'ms · Request #' + reqCount + ' (Baseline)';
        document.getElementById('dv-s1-output').textContent =
          '$ curl -s https://shop.preview.example.com/api/checkout | jq .\n' +
          '{\n' +
          '  "request_id": "req-baseline-0' + reqCount + '",\n' +
          '  "service": "checkout-api",\n' +
          '  "version": "v1.4.0",\n' +
          '  "environment": "baseline (demo-staging)",\n' +
          '  "db_schema": "public",\n' +
          '  "feature_flags": {\n' +
          '    "instant_payouts": false\n' +
          '  },\n' +
          '  "settlement_eta": "T+2 business days"\n' +
          '}';
      });
    }

    // Step 2: Re-run PR #42 Delta Diff
    const btnTriggerPr42 = document.getElementById('dv-btn-trigger-pr42');
    if (btnTriggerPr42) {
      btnTriggerPr42.addEventListener('click', function () {
        const card = document.getElementById('dv-s2-delta-card');
        if (card) {
          card.classList.add('dv-pulse');
          setTimeout(function () {
            card.classList.remove('dv-pulse');
          }, 550);
        }
      });
    }

    // Step 3: Browser Cookie Switcher
    const urlPills = Array.from(shell.querySelectorAll('[data-url-mode]'));
    function setUrlMode(mode) {
      urlPills.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-url-mode') === mode);
      });
      const addr = document.getElementById('dv-s3-address');
      const cookie = document.getElementById('dv-s3-cookie-badge');
      const title = document.getElementById('dv-s3-shop-title');
      const flag = document.getElementById('dv-s3-flag-pill');
      const responder = document.getElementById('dv-s3-responder');
      const schema = document.getElementById('dv-s3-schema');
      const eta = document.getElementById('dv-s3-eta');
      const trace = document.getElementById('dv-s3-trace');
      const banner = document.getElementById('dv-s3-banner');

      if (mode === 'pr42') {
        addr.textContent = 'https://shop.preview.example.com/?_diverge_env=pr-42';
        cookie.innerHTML = 'Set-Cookie: <code>_diverge_env=pr-42; HttpOnly; SameSite=Lax</code>';
        title.textContent = 'Instant Payouts Checkout Preview (PR #42)';
        flag.textContent = 'Flipt (preview-pr-42): instant_payouts = true';
        flag.className = 'dv-badge dv-badge-orange';
        responder.innerHTML = '<code>checkout-api-pr-42</code> (PR #42 Delta Pod)';
        schema.innerHTML = '<code>preview_pr_42</code> (<code>payout_rail: RTP_INSTANT</code>)';
        eta.textContent = 'Instant (< 4 seconds via FedNow / RTP)';
        trace.innerHTML =
          '<code>Browser</code> → <code>diverge-proxy (Cookie: _diverge_env=pr-42)</code> → <code>storefront-web [baseline]</code> → <code>[x-diverge-env: pr-42]</code> → <strong class="dv-trace-highlight">checkout-api-pr-42 [delta]</strong> → <code>PG [preview_pr_42]</code>';
        banner.hidden = false;
      } else {
        addr.textContent =
          mode === 'clear'
            ? 'https://shop.preview.example.com/?_diverge_env=clear'
            : 'https://shop.preview.example.com/';
        cookie.innerHTML =
          mode === 'clear'
            ? 'Set-Cookie: <code>_diverge_env=; Max-Age=0</code> (Cleared)'
            : 'Cookie: <code>none (Baseline Route)</code>';
        title.textContent = 'Standard Merchant Checkout (Baseline v1.4.0)';
        flag.textContent = 'Flipt (default): instant_payouts = false';
        flag.className = 'dv-badge dv-badge-gray';
        responder.innerHTML = '<code>checkout-api</code> (Shared Baseline Pod v1.4.0)';
        schema.innerHTML = '<code>public</code> (Standard T+2 ACH Schema)';
        eta.textContent = 'T+2 Business Days (Standard ACH)';
        trace.innerHTML =
          '<code>Browser</code> → <code>diverge-proxy</code> → <code>storefront-web [baseline]</code> → <code>checkout-api [baseline]</code> → <code>PG [public]</code>';
        banner.hidden = true;
      }
    }

    urlPills.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setUrlMode(btn.getAttribute('data-url-mode'));
      });
    });

    const bannerReset = document.getElementById('dv-s3-banner-reset');
    if (bannerReset) {
      bannerReset.addEventListener('click', function () {
        setUrlMode('clear');
      });
    }

    // Step 4: Scale-to-Zero & Wake Splash
    const btnHibernate = document.getElementById('dv-btn-hibernate');
    const btnWake = document.getElementById('dv-btn-wake');
    function setS2ZState(awake) {
      const badge = document.getElementById('dv-s4-http-badge');
      const replicas = document.getElementById('dv-s4-replicas');
      const title = document.getElementById('dv-s4-title');
      const sub = document.getElementById('dv-s4-sub');
      const st2 = document.getElementById('dv-s4-st2');
      const st3 = document.getElementById('dv-s4-st3');
      const log = document.getElementById('dv-s4-log');

      if (!awake) {
        badge.className = 'dv-badge dv-badge-orange';
        badge.textContent = 'HTTP 202 Accepted · Wake Splash Active';
        replicas.textContent = 'Deployment/checkout-api-pr-42: 0/1 Ready ($0.000/hr)';
        title.innerHTML = 'Waking Preview Environment <code>pr-42</code>…';
        sub.innerHTML =
          '<code>activator-proxy</code> triggered scale-up from <code>0 → 1</code> replica and is polling <code>GET /-/wakeup-status?env=pr-42</code>.';
        st2.className = 'dv-splash-step active';
        st3.className = 'dv-splash-step';
        log.textContent =
          '[21:00:00Z] hibernate-controller: env "pr-42" idle for 30m0s -> scaled checkout-api-pr-42 to 0 replicas\n' +
          '[21:00:00Z] metrics: diverge_environment_estimated_hourly_cost_usd{environment="pr-42"} 0.000\n\n' +
          '# Click "Wake Hibernated Preview (GET /)" above to trigger cold-start wake-up...';
      } else {
        badge.className = 'dv-badge dv-badge-green';
        badge.textContent = 'HTTP 200 OK · Preview Awake & Serving';
        replicas.textContent = 'Deployment/checkout-api-pr-42: 1/1 Ready ($0.012/hr)';
        title.innerHTML = 'Preview <code>pr-42</code> Ready — Redirected to Storefront!';
        sub.innerHTML =
          '<code>GET /-/wakeup-status?env=pr-42</code> returned <code>{"ready":true}</code>; browser auto-reloaded <code>https://shop.preview.example.com/</code>.';
        st2.className = 'dv-splash-step done';
        st3.className = 'dv-splash-step done';
        log.textContent =
          '[21:04:12Z] activator-proxy: GET / (env=pr-42) -> 0 ready endpoints, serving 202 Wake Splash HTML\n' +
          '[21:04:12Z] activator-proxy: scaled Deployment/checkout-api-pr-42 from 0 -> 1 replica\n' +
          '[21:04:13Z] GET /-/wakeup-status?env=pr-42 -> {"ready":false,"phase":"ScalingUp"}\n' +
          '[21:04:14Z] GET /-/wakeup-status?env=pr-42 -> {"ready":true,"phase":"Ready"}\n' +
          '[21:04:14Z] proxy: forwarding GET / -> checkout-api-pr-42 (10.244.1.88:8080) -> 200 OK (2.1s cold start)';
      }
    }

    if (btnHibernate) {
      btnHibernate.addEventListener('click', function () {
        setS2ZState(false);
      });
    }
    if (btnWake) {
      btnWake.addEventListener('click', function () {
        setS2ZState(true);
      });
    }

    // Step 5: AgentTask & Macaroon Budget Metering
    let agentSpend = 1.25;
    let agentBudget = 5.0;
    let agentTokens = 42000;
    let agentTokenLimit = 200000;
    let agentIter = 1;
    let agentSuspended = false;
    let agentSuspendReason = '';

    const btnMeter = document.getElementById('dv-btn-meter-call');
    const btnResume = document.getElementById('dv-btn-agent-resume');
    const modelSelect = document.getElementById('dv-s5-model');

    function renderAgentState(customNote) {
      const phaseBadge = document.getElementById('dv-s5-phase-badge');
      const tokenBadge = document.getElementById('dv-s5-token-badge');
      const spendLabel = document.getElementById('dv-s5-spend-label');
      const meterFill = document.getElementById('dv-s5-meter-fill');
      const httpCode = document.getElementById('dv-s5-http-code');
      const consoleEl = document.getElementById('dv-s5-console');

      const ratio = Math.min(
        1,
        Math.max(agentSpend / agentBudget, agentTokens / agentTokenLimit)
      );
      meterFill.style.transform = 'scaleX(' + ratio.toFixed(3) + ')';
      spendLabel.textContent =
        '$' +
        agentSpend.toFixed(2) +
        ' / $' +
        agentBudget.toFixed(2) +
        ' (' +
        agentTokens.toLocaleString('en-US') +
        ' / ' +
        agentTokenLimit.toLocaleString('en-US') +
        ' tokens)';

      if (customNote === 'disallowed_model') {
        httpCode.textContent = 'HTTP 403 Forbidden (Macaroon Caveat Violation)';
        consoleEl.textContent =
          '$ curl -X POST https://diverge-server.diverge-system.svc:8080/api/v1/agenttask/meter \\\n' +
          '  -H "Authorization: Bearer <macaroon>" \\\n' +
          '  -d \'{"model":"gpt-4o","tokensUsed":' +
          agentTokens +
          ',"costUSD":' +
          agentSpend.toFixed(2) +
          '}\'\n\n' +
          'HTTP/1.1 403 Forbidden\n' +
          '{\n' +
          '  "allowed": false,\n' +
          '  "error": "macaroon caveat rejected: model \\"gpt-4o\\" is not in allowed_models [claude-3-7-sonnet]"\n' +
          '}';
        return;
      }

      if (agentSuspended) {
        const reasonText =
          agentSuspendReason ||
          'costUSD ($' +
            agentSpend.toFixed(2) +
            ') exceeded budgetUSD ($' +
            agentBudget.toFixed(2) +
            ')';
        phaseBadge.className = 'dv-badge dv-badge-red';
        phaseBadge.textContent = 'Phase: Paused (Reason: BudgetExceeded)';
        tokenBadge.textContent = 'Macaroon: REVOKED';
        httpCode.textContent = 'HTTP 429 Too Many Requests';
        consoleEl.textContent =
          '$ curl -X POST https://diverge-server.diverge-system.svc:8080/api/v1/agenttask/meter \\\n' +
          '  -H "Authorization: Bearer <macaroon>" \\\n' +
          '  -d \'{"model":"claude-3-7-sonnet","tokensUsed":' +
          agentTokens +
          ',"costUSD":' +
          agentSpend.toFixed(2) +
          ',"iteration":' +
          agentIter +
          '}\'\n\n' +
          'HTTP/1.1 429 Too Many Requests\n' +
          '{\n' +
          '  "allowed": false,\n' +
          '  "suspended": true,\n' +
          '  "reason": "' +
          reasonText +
          '",\n' +
          '  "macaroonStatus": "revoked"\n' +
          '}';
      } else {
        phaseBadge.className = 'dv-badge dv-badge-green';
        phaseBadge.textContent = 'Phase: Running (gVisor)';
        tokenBadge.textContent = 'Macaroon: ACTIVE';
        httpCode.textContent = 'HTTP 200 OK';
        consoleEl.textContent =
          '$ curl -X POST https://diverge-server.diverge-system.svc:8080/api/v1/agenttask/meter \\\n' +
          '  -H "Authorization: Bearer <macaroon>" \\\n' +
          '  -d \'{"model":"claude-3-7-sonnet","tokensUsed":' +
          agentTokens +
          ',"costUSD":' +
          agentSpend.toFixed(2) +
          ',"iteration":' +
          agentIter +
          '}\'\n\n' +
          'HTTP/1.1 200 OK\n' +
          '{\n' +
          '  "allowed": true,\n' +
          '  "suspended": false,\n' +
          '  "task": "fix-pr-42-rounding",\n' +
          '  "costUSD": ' +
          agentSpend.toFixed(2) +
          ',\n' +
          '  "budgetUSD": ' +
          agentBudget.toFixed(2) +
          ',\n' +
          '  "remainingUSD": ' +
          Math.max(0, agentBudget - agentSpend).toFixed(2) +
          '\n' +
          '}';
      }
    }

    if (btnMeter) {
      btnMeter.addEventListener('click', function () {
        if (modelSelect && modelSelect.value === 'gpt-4o') {
          renderAgentState('disallowed_model');
          return;
        }
        if (agentSuspended) return;
        agentSpend = +(agentSpend + 1.35).toFixed(2);
        agentTokens += 45000;
        agentIter += 1;
        if (agentSpend > agentBudget) {
          agentSuspended = true;
          agentSuspendReason =
            'costUSD ($' +
            agentSpend.toFixed(2) +
            ') exceeded budgetUSD ($' +
            agentBudget.toFixed(2) +
            ')';
        } else if (agentTokens > agentTokenLimit) {
          agentSuspended = true;
          agentSuspendReason =
            'tokensUsed (' +
            agentTokens.toLocaleString('en-US') +
            ') exceeded max_tokens (' +
            agentTokenLimit.toLocaleString('en-US') +
            ')';
        }
        renderAgentState();
      });
    }

    if (btnResume) {
      btnResume.addEventListener('click', function () {
        agentBudget = +(agentBudget + 5.0).toFixed(2);
        agentTokenLimit += 200000;
        agentSuspended = false;
        agentSuspendReason = '';
        if (modelSelect) modelSelect.value = 'claude-3-7-sonnet';
        renderAgentState();
      });
    }

    // Step 6: diverge doctor & Merge Teardown
    const docPills = Array.from(shell.querySelectorAll('[data-doc-mode]'));
    const docOutput = document.getElementById('dv-s6-output');
    const docLink = document.getElementById('dv-s6-doc-link');

    const docScenarios = {
      healthy: {
        link: '/guides/troubleshooting/#diagnostic-error-codes-div-101--div-110',
        linkText: 'View DIV-101–DIV-110 Playbook →',
        out:
          '$ diverge doctor --namespace demo-staging\n' +
          '✓ Kubernetes API & Diverge CRDs (Environment, PreviewGroup, AgentTask) healthy\n' +
          '✓ PreviewGroup/pr-42 [Phase: Ready] (1 delta service: checkout-api-pr-42)\n' +
          '✓ Database Schema "preview_pr_42" & Secret/diverge-db-env-pr-42 synced\n' +
          '✓ HTTPRoute/checkout-api-pr-42 Programmed=True (header: x-diverge-env=pr-42)\n' +
          '✓ AgentTask/fix-pr-42-rounding [Phase: Succeeded] ($3.80 / $5.00 budget)\n\n' +
          'No issues found (0 critical, 0 warnings).',
      },
      div102: {
        link: '/guides/troubleshooting/#div-102-migration-failed',
        linkText: 'Open DIV-102 Remediation Guide →',
        out:
          '$ diverge doctor --namespace demo-staging\n' +
          '[CRITICAL] DIV-102  Environment/checkout-api-pr-42 (Migration)\n' +
          '  Summary:   Database migration hook job "atlas-migrate-pr-42" failed (BackoffLimitExceeded)\n' +
          '  Reason:    ERROR: column "payout_rail" of relation "orders" already exists (SQLSTATE 42701)\n' +
          '  Docs:      https://divergedev.com/guides/troubleshooting/#div-102-migration-failed\n' +
          '  Fix:       kubectl logs job/atlas-migrate-pr-42 -n demo-staging\n' +
          '             # Fix idempotent SQL (ADD COLUMN IF NOT EXISTS) and retry:\n' +
          '             diverge retry-hook checkout-api-pr-42',
      },
      div105: {
        link: '/guides/troubleshooting/#div-105-crashloopbackoff',
        linkText: 'Open DIV-105 Remediation Guide →',
        out:
          '$ diverge doctor --namespace demo-staging\n' +
          '[CRITICAL] DIV-105  Container/checkout-api (Pod/checkout-api-pr-42-6d8f9b-x4k2p)\n' +
          '  Summary:   Container "checkout-api" is in CrashLoopBackOff (exit code 1, restarts: 4)\n' +
          '  Reason:    panic: missing required env FLIPT_ADDR in preview deployment\n' +
          '  Docs:      https://divergedev.com/guides/troubleshooting/#div-105-crashloopbackoff\n' +
          '  Fix:       diverge logs checkout-api-pr-42 --previous',
      },
      div110: {
        link: '/guides/troubleshooting/#div-110-agenttask-budget-or-failure',
        linkText: 'Open DIV-110 Remediation Guide →',
        out:
          '$ diverge doctor --namespace demo-staging\n' +
          '[WARNING]  DIV-110  AgentTask/fix-pr-42-rounding\n' +
          '  Summary:   AgentTask is Paused (Reason: BudgetExceeded — $5.30 / $5.00 USD cap)\n' +
          '  Reason:    Macaroon token marked "revoked" in Secret/diverge-agenttask-tokens\n' +
          '  Docs:      https://divergedev.com/guides/troubleshooting/#div-110-agenttask-budget-or-failure\n' +
          '  Fix:       Comment "/diverge resume" on PR #42 or patch spec.budgetUSD: "10.00"',
      },
    };

    docPills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        const mode = pill.getAttribute('data-doc-mode');
        docPills.forEach(function (p) {
          p.classList.toggle('active', p === pill);
        });
        const sc = docScenarios[mode] || docScenarios.healthy;
        docOutput.textContent = sc.out;
        docLink.setAttribute('href', sc.link);
        docLink.textContent = sc.linkText;
      });
    });

    const btnMerge = document.getElementById('dv-btn-merge-pr');
    if (btnMerge) {
      btnMerge.addEventListener('click', function () {
        docOutput.textContent =
          '$ gh pr merge 42 --squash && diverge status --namespace demo-staging\n' +
          '[webhook] PR #42 merged -> deleting PreviewGroup/pr-42\n' +
          '  ✓ Finalizer divergedev.com/finalizer running teardown...\n' +
          '  ✓ Dropped PostgreSQL schema "preview_pr_42" CASCADE & deleted Secret/diverge-db-env-pr-42\n' +
          '  ✓ Deleted Flipt namespace "preview-pr-42" & Kafka topic "pr-42.orders.events"\n' +
          '  ✓ Deleted HTTPRoute/checkout-api-pr-42 & Deployment/checkout-api-pr-42\n' +
          '  ✓ Revoked & cleaned up AgentTask/fix-pr-42-rounding sandbox\n\n' +
          'Cluster returned to clean baseline: 3 baseline pods, 0 preview pods, 0 orphaned schemas ($0.00/hr).';
        clusterSummary.innerHTML =
          'Namespace: <code>demo-staging</code> · PR #42 Merged · 0 Preview Pods ($0.000/hr)';
        setUrlMode('clear');
      });
    }
  })();
</script>

---

## What You Just Experienced

1. **Delta Deployments (`PreviewGroup` & `diverge diff`)**: Instead of cloning `storefront-web`, `checkout-api`, and `fulfillment-worker` for every PR, Diverge deployed **only `checkout-api-pr-42`**—cutting preview compute by 67% on a 3-service stack (and >90% on a 25-service stack).
2. **Zero-Extension Browser Testing (`?_diverge_env=pr-42`)**: Clicking a shareable URL sets an `HttpOnly` `_diverge_env=pr-42` cookie in `diverge-proxy` and injects the floating **Preview Switcher Banner** so reviewers can toggle back to baseline with one click.
3. **Full-Stack State Isolation**: Each preview automatically receives an isolated PostgreSQL schema (`preview_pr_42`) migrated via Ariga Atlas, an isolated Flipt feature flag namespace (`preview-pr-42`), and isolated Kafka topics (`pr-42.orders.events`).
4. **Serverless Scale-to-Zero (`activator-proxy --wake-splash`)**: Idle previews scale down to `0` pods and wake seamlessly with a `202 Accepted` HTML splash screen that polls `GET /-/wakeup-status` until ready.
5. **Cryptographic `AgentTask` Governance**: Autonomous coding agents run in `gvisor`/`kata` sandboxes with HMAC-SHA256 Macaroon capability caveats (`max_cost_usd`, `max_tokens`, `allowed_models`) enforced live on every `POST /api/v1/agenttask/meter` call.
6. **Actionable Diagnostics (`DIV-101`–`DIV-110`)**: `diverge doctor` surfaces deterministic error codes linked directly to the [Troubleshooting Playbook](/guides/troubleshooting/#diagnostic-error-codes-div-101--div-110).
