# UNITY Army

UNITY Army is UNITY's specialist-agent engineering organization. It is deliberately hierarchical rather than a free-form swarm.

## Chain of command

User → Principal Engineer → Lead Engineers → Specialist Engineers → Lead review → Principal integration → one full gate → user approval where required.

Each specialist owns a narrow subsystem. Examples: Supabase Engineer, OAuth Engineer, GitHub Engineer, Vercel Engineer, Infisical Engineer, Model Routing Engineer, E2E Engineer. A specialist must reject work outside its declared allowed areas instead of silently becoming a generalist.

## Truthful status

Supported states: IDLE, ASSIGNED, WORKING, WAITING, BLOCKED, REVIEWING, READY_FOR_REVIEW, PAUSED, FAILED, DONE, CANCELLED, STALE.

WORKING requires a real fresh heartbeat. Active states with an expired heartbeat become STALE. A language-model statement such as "I am working" is never sufficient evidence of work.

## Isolation

Specialists will receive one task scope and one branch/worktree. No specialist may merge, deploy, send communications or perform production writes independently. Department leads review specialist work. The Principal Engineer owns integration.

## Runtime plan

Mastra is the intended hierarchical agent/supervisor runtime. UNITY owns identity, permissions, task state, heartbeat truth, project/account scoping and approval policy. Trigger.dev-style durable workers can execute long-running jobs, and Langfuse-style traces can provide auditable activity. These integrations are separate from the roster and are not considered connected until real configuration exists.

## Current state

This bundle creates the roster, hierarchy validation, specialty guard, heartbeat/stale logic, reporting contract, Mastra adapter contract, persistence proposal and an `/army` control-room preview. Live agent execution remains disabled. This prevents the UI from pretending agents are working before real workers and model providers exist.
