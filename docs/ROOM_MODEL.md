# UNITY room model and embedded brain

UNITY's interface follows a home-like mental model without literal room graphics or playful naming. A user should know where something belongs before learning the underlying architecture.

## The rule

**One room, one primary job. Shared intelligence underneath.**

A record can be related to many things internally, but it has one primary home in the interface. This avoids the FPX Lead Journey Lab problem where decisions, automations, journeys, technical controls and operational detail compete on one surface.

## Rooms

| Room | Primary purpose | What belongs there |
|---|---|---|
| Home | Orientation | Welcome, continue work, genuine attention items, natural-language routing |
| Projects | Containers | Clients, personal initiatives, goals, project scope, project-linked resources |
| Conversations | Discussion | Human/AI conversation history, decisions under discussion, handoffs |
| Knowledge | Trusted understanding | Notes, approved memory, source relationships, procedures, preferences, knowledge map |
| Automations | Repeatable behavior | Schedules, event triggers, recurring routines, automation drafts and execution history |
| Settings | Personal controls | Appearance, backup, account/privacy settings, global preferences |
| Daily Briefing | Cross-room summary | Source-backed changes from connected rooms/apps |
| Tasks | Discrete work | One-off work items, evidence, approvals, completion state |
| Integrations | Doors to external systems | Authorized apps/accounts, scopes, sync health, revocation |
| Cloud | Persistence infrastructure | Authenticated server-backed data status and migration |
| Models / Tools | Advanced capability | Provider and tool discovery/configuration |
| Readiness | Release/admin | Technical acceptance evidence; not part of normal daily use |

The advanced rooms remain behind More / command search until they are relevant.

## Automatic routing

The Home intent field and future unified assistant route intent to the appropriate room. Routing is navigation, not silent execution.

Examples:
- "Open the FPX project" → Projects.
- "Remember George wants this copy style" → Knowledge draft inside FPX.
- "Every Monday prepare the stock report" → Automations.
- "What did we decide about this?" → Conversations / Knowledge retrieval.
- "What changed yesterday?" → Daily Briefing.
- "Connect my Google Calendar" → Integrations.
- "Make this one-off task" → Tasks.

The user can always override the proposed destination.

## Embedded brain / relationship graph

UNITY maintains a relationship layer beneath the rooms. It is inspired by knowledge-graph concepts, not by copying Obsidian's product or UI.

Initial node families:
- Person / owner profile
- Project
- Approved knowledge
- Source
- Conversation
- Task
- Automation
- Connected account/resource
- Artifact
- Event / decision

Initial relationships:
- project contains knowledge
- project tracks task
- project owns automation
- project references source
- conversation concerns project
- source supports knowledge
- automation reads/writes authorized resource
- event updates project
- preference applies to owner/project

### Important trust rule

Graph edges are not automatically treated as facts merely because an AI inferred them. There are three relationship levels:

1. **Structural** — deterministic relationship from stored data, such as a note's project ID.
2. **Source-supported** — relationship supported by a cited source.
3. **Suggested** — AI-proposed relationship awaiting confirmation.

The first local graph implementation renders only deterministic structural relationships.

## Personal identity

"How you are as a person" belongs in the Knowledge layer as an owner profile with provenance and control, not as hidden model profiling.

Future personal profile domains may include:
- communication style
- recurring preferences
- work routines
- decision rules
- people/organization relationships
- recurring constraints
- device/app preferences

Sensitive personal information should never be inferred or persisted merely because it appeared once. Persistent personal rules require transparent source/approval behavior and must be editable/revocable.

## Why this remains simple

The default interface never requires a graph editor. Knowledge Map is an optional disclosure. Users work with normal projects, notes, conversations and automations; UNITY derives relationships behind the scenes.

The graph helps routing, retrieval and context assembly. It does not replace the original records and it never overrides project isolation or source provenance.
