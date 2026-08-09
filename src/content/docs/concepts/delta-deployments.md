---
title: Delta Deployments
description: Learn about Delta Deployments
---

Delta Deployments are a core concept in Diverge. Rather than cloning your entire microservice architecture, Diverge identifies which specific services have changed in your Merge Request and deploys only those modified services.

## How it works
1. **Dependency Analysis:** Diverge checks your Git diff against configured paths.
2. **Selective Deployment:** Only the modified services are deployed to the cluster.
3. **Traffic Routing:** Using header-based routing, traffic intended for the preview environment is routed to the new, delta deployments. Any requests to unmodified services gracefully fall back to your shared baseline environment.

This approach significantly reduces deployment time and cluster resource usage.
