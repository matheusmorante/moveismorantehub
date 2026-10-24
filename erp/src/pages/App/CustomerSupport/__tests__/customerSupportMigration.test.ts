import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const migrationsDirectory = new URL('../../../../../../supabase/migrations/', import.meta.url);
const migrationFiles = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('_customer_support_inbox_completion.sql'));
if (migrationFiles.length !== 1) throw new Error('Esperada uma única migration de conclusão da Inbox.');
const migration = readFileSync(new URL(migrationFiles[0], migrationsDirectory), 'utf8');
const listFunction = migration.split('CREATE OR REPLACE FUNCTION public.customer_support_list_conversations(')[1]
  ?.split('$function$;')[0].replace(/--[^\n]*/g, '');
const baseStatusScope = listFunction?.match(/FROM public\.whatsapp_conversations AS conversation\s+WHERE\s+CASE([\s\S]*?)END/)?.[1];

describe('Contrato estático da migration da Inbox (não é prova PostgreSQL)', () => {
  it('deixa a pasta definir seu escopo antes de excluir fechadas na fila padrão', () => {
    expect(baseStatusScope?.trim()).toMatch(/^WHEN v_criteria <> '\{\}'::jsonb THEN true/);
    expect(listFunction).toContain("WHEN 'closed' THEN conversation.is_archived OR conversation.tags @> ARRAY['status:closed']::text[]");
  });

  it('preserva o escopo padrão sem pasta e conta antes de paginar', () => {
    expect(baseStatusScope).toContain("ELSE NOT conversation.is_archived AND NOT (conversation.tags @> ARRAY['status:closed']::text[])");
    expect(listFunction?.indexOf('count(*) OVER ()')).toBeLessThan(listFunction?.indexOf('LIMIT v_page_size') ?? 0);
  });

  it('aplica filtros de pedidos e a permissão comercial antes da paginação', () => {
    const pageLimit = listFunction?.indexOf('LIMIT v_page_size') ?? -1;
    const orderFilters = [
      listFunction?.indexOf("AND (v_filter <> 'with_orders' OR EXISTS"),
      listFunction?.indexOf("AND (v_filter <> 'without_orders' OR NOT EXISTS"),
      listFunction?.indexOf('AND (v_folder_orders IS NULL OR CASE v_folder_orders'),
    ];
    const commercialGate = listFunction?.indexOf('IF v_needs_orders AND NOT public.customer_support_can_view_commercial_info()') ?? -1;

    expect(pageLimit).toBeGreaterThan(0);
    expect(orderFilters.every((position) => position !== undefined && position >= 0 && position < pageLimit)).toBe(true);
    expect(commercialGate).toBeGreaterThanOrEqual(0);
    expect(commercialGate).toBeLessThan(listFunction?.indexOf('RETURN QUERY') ?? 0);
  });

  it('exige as permissões da Central e comercial nas RPCs de dados comerciais', () => {
    for (const name of [
      'customer_support_list_conversations',
      'customer_support_list_customer_summaries',
      'customer_support_list_customer_orders',
      'customer_support_count_customer_orders',
      'customer_support_search_customers',
      'customer_support_link_customer',
      'customer_support_unlink_customer',
    ]) {
      const definition = migration.split(`CREATE OR REPLACE FUNCTION public.${name}(`)[1]?.split('$function$;')[0];
      expect(definition, `${name} deve existir na migration`).toBeTruthy();
      expect(definition).toContain('public.customer_support_can_view()');
      expect(definition).toContain('public.customer_support_can_view_commercial_info()');
    }
  });

  it('restringe o diretório de atendentes a id, nome e função, atrás do gate da Central', () => {
    const directory = migration.split('CREATE OR REPLACE FUNCTION public.customer_support_list_agents()')[1]?.split('$function$;')[0];
    expect(directory).toMatch(/^\s*RETURNS TABLE \(id uuid, full_name text, role text\)/);
    expect(directory).toContain('public.customer_support_can_view()');
  });

  it('restringe os helpers sem revogar o schema compartilhado nem remover políticas', () => {
    expect(migration).not.toMatch(/\bDROP\b/i);
    expect(migration).not.toMatch(/REVOKE ALL ON SCHEMA private/i);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION private\.customer_support_profile_has_permission/);
    expect(migration).toContain('ALTER POLICY whatsapp_conversations_select');
    expect(migration).toContain("message_type IN ('internal_note', 'system_event')");
  });
});

// This opt-in runs read-only denial checks. It never authenticates as an
// operator, creates fixtures, sends messages or bypasses write-fixture gates.
const runRemoteReadOnly = process.env.RUN_CUSTOMER_SUPPORT_REMOTE_READONLY_TESTS === '1';
describe.skipIf(!runRemoteReadOnly)('Supabase remoto operacional — leitura anônima negada', () => {
  let anonymousClient: SupabaseClient;

  beforeAll(() => {
    const envFile = new URL('../../../../../.env.local', import.meta.url);
    const runtimeUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const runtimeKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const configured = runtimeUrl && runtimeKey
      ? { VITE_SUPABASE_URL: runtimeUrl, VITE_SUPABASE_ANON_KEY: runtimeKey }
      : parse(readFileSync(fileURLToPath(envFile), 'utf8'));
    const url = configured.VITE_SUPABASE_URL;
    const key = configured.VITE_SUPABASE_ANON_KEY;
    if (!url || new URL(url).hostname !== 'hkoxhourxwlddgsfdgws.supabase.co') {
      throw new Error('Projeto operacional da Central não confirmado.');
    }
    if (!key || key === 'test-anon-key') throw new Error('Chave pública válida não configurada.');
    anonymousClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  });

  it.each([
    'whatsapp_conversations', 'whatsapp_messages', 'whatsapp_usage_monthly', 'customer_support_inboxes',
  ])('nega SELECT anon em %s sem solicitar registros', async (table) => {
    const { data, error } = await anonymousClient.from(table).select('*').limit(0);
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  }, 20_000);

  it.each(['customer_support_can_view', 'customer_support_can_view_commercial_info'])(
    'nega execução anon da RPC %s', async (rpc) => {
      const { data, error } = await anonymousClient.rpc(rpc);
      expect(error?.code).toBe('42501');
      expect(data).toBeNull();
    }, 20_000,
  );
});
