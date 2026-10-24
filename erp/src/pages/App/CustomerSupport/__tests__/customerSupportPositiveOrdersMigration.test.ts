import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../../../../../supabase/migrations/20261024122401_customer_support_positive_orders_fixture_guard.sql', import.meta.url), 'utf8');
const guard = migration.split('CREATE OR REPLACE FUNCTION public.customer_support_guard_test_artifact()')[1]?.split('$function$;')[0] || '';
const manifest = migration.split('CREATE OR REPLACE FUNCTION public.customer_support_test_fixture_manifest(p_run_id uuid)')[1]?.split('$function$;')[0] || '';

describe('Proposta da fixture sintética com pedidos — inspeção estática, sem DML', () => {
  it('só permite vincular uma vez o cliente da mesma execução com permissão comercial', () => {
    expect(guard).toContain("v_meta->>'scenarioKey' IS DISTINCT FROM 'support-positive-orders'");
    expect(guard).toContain("OLD.customer_link_status IS DISTINCT FROM 'unlinked'");
    expect(guard).toContain("NEW.customer_link_status IS DISTINCT FROM 'manually_linked'");
    expect(guard).toContain("v_identity->>'ownerId' IS DISTINCT FROM auth.uid()::text");
    expect(guard).toContain('NOT public.customer_support_can_view_commercial_info()');
    expect(guard).toContain("public.assert_test_artifact_link(v_identity, 'people', NEW.customer_id)");
    expect(guard).toContain("order_row.order_data#>>'{testArtifact,runId}' = v_identity->>'runId'");
    expect(guard).toContain("order_row.order_data#>>'{testArtifact,ownerId}' = v_identity->>'ownerId'");
    expect(guard).toContain('v_order_count <> 1');
  });

  it('limita a fixture a uma conversa, uma âncora e um evento normal de arquivamento', () => {
    expect(guard).toContain("v_positive_orders_fixture := v_meta->>'scenarioKey'='support-positive-orders';");
    expect(guard).toContain('v_limit := 2;');
    expect(guard).toContain('uma conversa por execução de pedidos');
    expect(guard).toContain("NEW.raw_payload->>'supportFixtureIndex' IS DISTINCT FROM '1'");
    expect(guard).toContain("current_setting('morante.customer_support_order_fixture', true) IS DISTINCT FROM v_identity->>'runId'");
    expect(guard).toContain("NEW.raw_payload->>'status'='closed'");
    expect(manifest).toContain("'conversationLimit', 1, 'messageLimit', 2, 'workingMessageLimit', 1, 'cleanupReserved', 1");
  });

  it('provisiona tudo em uma única transação autenticada com os fluxos seguros existentes', () => {
    const provisioner = migration.split('CREATE OR REPLACE FUNCTION public.customer_support_provision_test_order_conversation(p_run_id uuid)')[1]?.split('$function$;')[0] || '';
    expect(provisioner).toContain('SECURITY INVOKER');
    expect(provisioner).toContain('public.is_administrator()');
    expect(provisioner).toContain('public.customer_support_can_view()');
    expect(provisioner).toContain('public.customer_support_can_view_commercial_info()');
    expect(provisioner).toContain("'support-fixture:' || p_run_id::text");
    expect(provisioner).toContain('TEST_ARTIFACT_CONFLICT');
    expect(provisioner).toContain('public.create_test_artifact_order(p_run_id, NULL)');
    expect(provisioner).toContain("'support-positive-orders'");
    expect(provisioner).toContain('public.customer_support_link_customer(v_conversation_id, v_order->>\'personId\')');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.customer_support_provision_test_order_conversation(uuid) FROM PUBLIC, anon, service_role');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.customer_support_provision_test_order_conversation(uuid) TO authenticated');
  });

  it('preserva os limites anteriores e não altera tabelas nem triggers', () => {
    expect(guard).toContain('v_limit integer := 202;');
    expect(guard).toContain("v_limit := 68;");
    expect(guard).toContain('v_message_count >= 63');
    expect(migration).not.toMatch(/\b(DROP|ALTER TABLE|CREATE TRIGGER|DISABLE TRIGGER)\b/i);
  });
});
