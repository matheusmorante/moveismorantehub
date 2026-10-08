---
name: supabase-migration-lifecycle
description: Manage Supabase SQL migration creation, edits, replacement, removal, status tracking, and authorized application. Use whenever a task changes or reviews Supabase migrations.
---

# Supabase Migration Lifecycle

Follow this skill whenever creating, editing, replacing, reviewing, removing, or applying a Supabase SQL migration. The goal is to keep the local migration set and each supported database environment understandable, reproducible, and free of unexplained pending files.

For database test setup and fixture rules, follow [database-supabase](../database-supabase/SKILL.md) and `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`. For compatibility and rollback design, follow [migration](../migration/SKILL.md). Do not duplicate or override those policies here.

## Before changing a migration

1. Inspect the local migration files and identify the change, its ordering, dependencies, affected data, functions, triggers, grants, and RLS policies.
2. Read the migration history for each relevant environment and confirm the project ref and environment before any remote access. Compare exact versions and names; then inspect the live schema when history alone cannot establish what exists.
3. Check for an existing pending migration or an equivalent change under another version. A date, filename, or similar name alone does not prove that a migration was applied or is redundant. Compare the actual SQL effects and dependency chain.
4. If history, schema, environment, or application status cannot be established, stop edits or deletion and classify the migration as `BLOCKED` with the missing evidence and next action.

## Choose the correct lifecycle action

- **Confirmed unapplied everywhere relevant:** edit the existing file when it already represents the intended change. Create another migration only when a separate ordered change is needed.
- **Applied in any supported environment:** preserve the file and its history. Make corrections in a new forward migration; do not rewrite history or edit `supabase_migrations.schema_migrations`.
- **Pending and superseded:** verify that the replacement covers every schema and data effect, that no dependent migration needs the old file, and that supported environments will retain the required result. Remove the old pending file only when that evidence is clear and removal is within the user's requested scope.
- **Outcome uncertain:** do not guess from age or convention. Keep the file and document a blocker until history and schema can be reconciled.

When the remote database has the effect under a different version, record the remote version and the schema evidence. Do not call the local file “applied” unless that exact version exists in the migration history.

## Validate and apply

- Review forward effects, failure behavior, idempotency, data preservation, compatibility with deployed readers and writers, rollback limits, permissions, indexes, constraints, triggers, functions, and RLS as relevant.
- Run the focused validation required by the project. For this repository, follow `AGENTS.md`, `database-supabase`, and `docs/testing/SUPABASE_REMOTE_TEST_POLICY.md`; record any validation that cannot be performed and why.
- Before a remote migration, confirm the exact project ref and environment, inspect the complete pending set, and run `npm run advisors`. Do not use `supabase db push` or another bulk apply path when it could include unreviewed migrations.
- Apply only the migrations authorized for that target environment. Approval to edit a migration does not by itself authorize a remote schema change. Never manipulate remote migration history to hide a pending version.
- After application, confirm the exact version in remote history and inspect the resulting schema. If the result is uncertain or a request times out, reconcile before retrying; do not blindly resend an application.

## Required end state

Every migration created, changed, or evaluated in the task must end in one explicit state, recorded in the task or deployment report:

- `APPLIED`: the exact version is in the relevant remote history and the resulting schema has been verified.
- `READY`: applicable validation passed; target environment and next authorized deployment step are stated.
- `BLOCKED`: reason, target environment, missing prerequisite, and next action are stated.
- `SUPERSEDED`: replacement and evidence of dependency/effect coverage are stated; pending-file removal is decided explicitly.
- `DISCARDED`: the migration was never applied in any relevant environment and the reason for safe removal is recorded.

Do not report a task as fully deployed while a required migration is still `READY` or `BLOCKED`. Do not leave a new migration pending without one of these recorded states.
