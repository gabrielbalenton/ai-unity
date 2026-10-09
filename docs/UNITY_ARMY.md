# UNITY Army

UNITY Army is UNITY's specialist-agent engineering organization. It is deliberately hierarchical rather than a free-form swarm.

## Chain of command

Gabriel → UNITY GM / Principal Engineer → Lead Engineers → Specialist Engineers → Lead review → Principal integration → one full gate → Gabriel approval where required.

Each specialist owns a narrow subsystem. Examples: Supabase Engineer, OAuth Engineer, GitHub Engineer, Vercel Engineer, Infisical Engineer, Model Routing Engineer, E2E Engineer. A specialist must reject work outside its declared allowed areas instead of silently becoming a generalist.

## Interactive office

`/army` is the Agent Control Room. It is designed as a department-labelled office rather than a plain table. Every lead and specialist has a desk/status tile. Clicking an engineer opens the detailed report. Right-clicking opens the control menu for Continue, Pause, Stop, Assign next approved task, and Request Gabriel decision.

The browser refreshes the army snapshot every 60 seconds. Live state can replace polling once the durable worker runtime and event stream are connected. Until then, the page clearly says that the control runtime is not connected and does not fabricate activity.

## Gabriel-facing status language

The detailed runtime states remain precise, but the Control Room groups them into the four operational states Gabriel asked to see:

- **Working** — show the current task and fresh heartbeat.
- **Paused** — show why it is paused, what dependency it is waiting for, or whether Gabriel approval is required.
- **Stopped** — show the blocking error, stale heartbeat, failed task, cancellation, or unresolved blocker.
- **Finished** — show the finished task and whether another approved task is available.

Supported internal states remain: IDLE, ASSIGNED, WORKING, WAITING, BLOCKED, REVIEWING, READY_FOR_REVIEW, PAUSED, FAILED, DONE, CANCELLED, STALE.

WORKING requires a real fresh heartbeat. Active states with an expired heartbeat become STALE. A language-model statement such as "I am working" is never sufficient evidence of work.

## GM decision policy

The UNITY GM is responsible for keeping the team moving without bothering Gabriel for routine safe work. The GM may continue an active approved task, resume work when an ordinary dependency clears, perform bounded recovery/reassignment for recoverable failures, and assign the next already-approved task to an appropriate specialist.

The GM must pause and request Gabriel's decision for protected or owner-only decisions, including production writes, deployments, sending external communications, paid inference, secret access, cross-project actions, architecture changes, or any ambiguous decision that changes the approved scope.

A finished engineer does not invent work. If an approved next task exists, the GM may assign it. Otherwise the engineer becomes idle and the report says that no approved next task is queued.

## Reporting

The GM report separates what was completed, what is still working, what is paused, what has stopped, what is finished, and the exact items that need Gabriel's decision. Meaningful state changes such as BLOCKED, FAILED, PAUSED, READY_FOR_REVIEW, DONE, or STALE are reportable events rather than silent status changes.

## Isolation

Specialists will receive one task scope and one branch/worktree. No specialist may merge, deploy, send communications or perform production writes independently. Department leads review specialist work. The Principal Engineer owns integration.

## Runtime plan

Mastra is the intended hierarchical agent/supervisor runtime. UNITY owns identity, permissions, task state, heartbeat truth, project/account scoping and approval policy. Trigger.dev-style durable workers can execute long-running jobs, and Langfuse-style traces can provide auditable activity. These integrations are separate from the roster and are not considered connected until real configuration exists.

## Current state

The current bundle creates the roster, hierarchy validation, specialty guard, heartbeat/stale logic, GM decision policy, reporting contract, Mastra adapter contract, persistence proposal, authenticated snapshot endpoint and interactive `/army` office preview. Live agent execution remains disabled. This prevents the UI from pretending agents are working before real workers, persistence and model providers exist.
