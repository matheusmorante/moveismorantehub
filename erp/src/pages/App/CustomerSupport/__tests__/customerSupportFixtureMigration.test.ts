import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { supportFixtureProvisionSchema } from '../../../../../../shared-utils/customerSupportFormSchemas';

const sql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-test-artifact-guards.sql', import.meta.url), 'utf8');
const searchSql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-literal-search.sql', import.meta.url), 'utf8');
const conflictSql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-domain-conflicts.sql', import.meta.url), 'utf8');
const cleanupSql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-cleanup-events.sql', import.meta.url), 'utf8');

describe('Preparação limitada de fixtures da Central — contrato estático, sem prova PostgreSQL', () => {
  it('preserva o schema e dados existentes com DDL transacional e prazos', () => {
    expect(sql).toContain('BEGIN;');
    expect(sql.trim().endsWith('COMMIT;')).toBe(true);
    expect(sql).toContain("lock_timeout = '5s'");
    expect(sql).not.toMatch(/\b(?:DROP|TRUNCATE|CREATE TABLE|CREATE SCHEMA|ADD COLUMN)\b/i);
    expect(sql.match(/CREATE TRIGGER/g)).toHaveLength(3);
  });
  it('nega execução anônima e deriva a identidade do usuário real', () => {
    expect(sql).toContain('public.is_administrator()');
    expect(sql).toContain('public.customer_support_can_view()');
    expect(sql).toContain('public.assert_test_artifact_identity(v_meta)');
    expect(sql).toContain("'ownerId', auth.uid()");
    expect(sql).not.toMatch(/GRANT.*\b(?:anon|PUBLIC)\b/);
    expect(sql.match(/SECURITY DEFINER SET search_path = ''/g)).toHaveLength(4);
  });
  it('limita quantidades e mantém notas pelo comando real', () => {
    expect(sql).toContain('NOT BETWEEN 1 AND 51');
    expect(sql).toContain('NOT BETWEEN 1 AND 81');
    expect(sql).toContain('>= 151');
    expect(sql).toContain('public.customer_support_add_internal_note(v_conversation_id, p_history[v_history_index])');
  });
  it('protege identificação, histórico e vínculos operacionais', () => {
    expect(sql).toContain('TEST_ARTIFACT_IMMUTABLE');
    expect(sql).toContain('TEST_ARTIFACT_RETAINED');
    expect(sql).toContain('NEW.customer_id IS NOT NULL');
    expect(sql).toContain('NEW.api_message_id IS NOT NULL OR NEW.media_id IS NOT NULL OR NEW.media_url IS NOT NULL');
    expect(sql).toContain("NEW.direction <> 'outbound' OR NEW.message_type NOT IN ('internal_note', 'system_event')");
    expect(sql).not.toMatch(/\b(?:http_post|net\.http|dblink)\b/i);
  });
  it('reutiliza a mesma execução somente quando a solicitação coincide', () => {
    expect(sql).toContain("v_manifest->>'inputHash' IS DISTINCT FROM v_hash");
    expect(sql).toContain("v_manifest->>'scenarioKey' IS DISTINCT FROM p_scenario_key");
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('customer_support_test_anchor_unique');
    expect(sql).toContain('customer_support_test_folder_run_unique');
  });
});

describe('Busca literal antes da normalização de telefone', () => {
  it('altera somente as duas consultas existentes, mantendo assinaturas e permissões', () => {
    expect(searchSql.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(2);
    expect(searchSql).toContain('public.customer_support_list_conversations(');
    expect(searchSql).toContain('public.customer_support_search_customers(');
    expect(searchSql).not.toMatch(/\b(?:GRANT|REVOKE|CREATE TABLE|ALTER TABLE|DROP|TRUNCATE)\b/);
    expect(searchSql).toContain('CUSTOMER_SUPPORT_COMMERCIAL_PERMISSION_DENIED');
  });
  it('só reduz entradas formadas por caracteres de telefone nos três caminhos', () => {
    expect(searchSql.match(/~ '\^\[\+0-9\[:space:\]\(\)\.-\]\+\$'/g)).toHaveLength(3);
    expect(searchSql).toContain("v_folder_phone_digits := CASE WHEN v_folder_search ~");
    expect(searchSql).toContain("v_phone_digits := CASE WHEN v_search ~");
    expect(searchSql).toContain("ELSE '' END;");
  });
});

describe('Conflitos de domínio sem retry de transação', () => {
  it('substitui somente as duas funções mantendo gates e contratos', () => {
    expect(conflictSql.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(2);
    expect(conflictSql).toContain('public.customer_support_set_internal_notes(');
    expect(conflictSql).toContain('public.customer_support_provision_test_conversations(');
    expect(conflictSql).toContain('FOR UPDATE');
    expect(conflictSql).toContain('public.customer_support_can_view()');
    expect(conflictSql).not.toMatch(/\b(?:GRANT|REVOKE|DROP|TRUNCATE|CREATE TABLE|ALTER TABLE)\b/);
  });
  it('não pede retry para divergência da base ou da solicitação', () => {
    expect(conflictSql).not.toContain("'40001'");
    expect(conflictSql.match(/ERRCODE = 'P0001'/g)).toHaveLength(2);
    expect(conflictSql).toContain('CUSTOMER_SUPPORT_NOTES_CONFLICT:');
    expect(conflictSql).toContain('TEST_ARTIFACT_CONFLICT:');
    expect(conflictSql).toContain("COALESCE(v_notes, '') IS DISTINCT FROM COALESCE(p_expected_notes, '')");
  });
});

describe('Reserva revisável para os eventos do arquivamento normal', () => {
  it('preserva as guardas e altera somente quota e metadata de prontidão', () => {
    expect(cleanupSql.match(/CREATE OR REPLACE FUNCTION/g)).toHaveLength(2);
    expect(cleanupSql).toContain('public.customer_support_guard_test_artifact()');
    expect(cleanupSql).toContain('public.customer_support_test_fixture_manifest(p_run_id uuid)');
    expect(cleanupSql).toContain('>= 202');
    expect(cleanupSql).toContain("jsonb_build_object('messageLimit', 202)");
    expect(cleanupSql).toContain('public.assert_test_artifact_identity(v_meta)');
    expect(cleanupSql).toContain('TEST_ARTIFACT_RETAINED');
    expect(cleanupSql).not.toMatch(/\b(?:GRANT|REVOKE|DROP|TRUNCATE|CREATE TABLE|ALTER TABLE)\b/);
  });
});

describe('Solicitação de provisionamento compartilhada', () => {
  const input = { runId: '831efec0-724b-49d5-aadc-10b7c2e793df', scenarioKey: 'support_inbox', contactNames: ['Contato'], history: ['Nota'] };
  it('normaliza nomes e aplica o schema real de comentário', () => {
    const parsed = supportFixtureProvisionSchema.parse({ ...input, contactNames: [' Contato '], history: [' Nota '] });
    expect(parsed.contactNames).toEqual(['Contato']);
    expect(parsed.history).toEqual(['Nota']);
    expect(supportFixtureProvisionSchema.safeParse({ ...input, history: [' '] }).success).toBe(false);
    expect(supportFixtureProvisionSchema.safeParse({ ...input, history: ['x'.repeat(2001)] }).success).toBe(false);
  });
  it('rejeita identidade e quantidades fora da operação autorizada', () => {
    for (const patch of [{runId: ''}, {scenarioKey: 'invalid scenario'}, {contactNames: []},
      {contactNames: Array(52).fill('Contato')}, {history: Array(82).fill('Nota')}]) {
      expect(supportFixtureProvisionSchema.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
});
