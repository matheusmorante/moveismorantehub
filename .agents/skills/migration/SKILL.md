---
name: migration
description: Implement reversible compatibility-safe transitions. Use for schema, data, API, protocol, configuration, or dependency migrations requiring rollback and preservation proof.
---

# Migration

## Quando aplicar esta Skill

Use em migrações de schema, dados, APIs, protocolos, configuração ou dependências que precisem preservar compatibilidade ou permitir rollback.

## Quando NÃO aplicar

Não use para repetir validações de uma transição já aprovada sem mudança ou evidência nova. Para execução, isolamento de banco e estados de gate, siga `testes-seguros-erp` e `database-supabase`.

Map current readers, writers, data shape, compatibility window, and ownership before editing.

- Define forward path and rollback path.
- Preserve existing data; make destructive steps explicit and separately authorized.
- Keep mixed-version operation safe where rollout can overlap.
- Sequence expand, migrate, verify, then contract when applicable.
- Make retries idempotent and partial failure observable.
- Verify old and new paths at required transition stages.
- Reuse an approved migration/transition gate while migration, baseline, runtime and target database are unchanged; reopening requires evidence that one of them changed or a failure appeared.

Stop after requested stage passes; do not perform later destructive contraction implicitly.

## Referências e Fonte Canônica de Documentação

- Gates, ambiente de teste e retomada: `.agents/skills/testes-seguros-erp/SKILL.md`.
- Schema, RLS e operações Supabase: `.agents/skills/database-supabase/SKILL.md`.
