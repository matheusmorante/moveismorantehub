import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { processWhatsAppWebhookPayload } from '@/pages/utils/customerSupport/whatsappWebhookProcessor';

const payload = {
  entry: [{ changes: [{ value: {
    metadata: { phone_number_id: 'channel-unit' },
    contacts: [{ wa_id: '5511999990000', profile: { name: 'Contato unitário' } }],
    messages: [{ id: 'wamid.unit-inbound', from: '5511999990000', timestamp: '1792580000',
      type: 'image', image: { id: 'media-unit', mime_type: 'image/jpeg', caption: 'Legenda' },
      context: { id: 'wamid.unit-reply' } }],
  } }] }],
};

function client(options: { inserted?: boolean; error?: object; receipt?: unknown; lookupError?: object; conversationError?: object; existingMessage?: boolean } = {}) {
  const read = (data: unknown, error: unknown = null) => ({
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    // Deliberately no insert/update methods: inbound effects belong to the RPC.
  });
  return {
    rpc: vi.fn().mockResolvedValue({ error: options.error ?? null,
      data: 'receipt' in options ? options.receipt : {
        conversation_id: 'conv-unit', message_id: 'msg-unit', inserted: options.inserted ?? true, reopened: true,
      } }),
    from: vi.fn((table: string) => {
      if (table === 'whatsapp_messages') return read(options.existingMessage ? { id: 'msg-unit' } : null, options.lookupError);
      if (table === 'whatsapp_conversations') return read({ id: 'conv-unit', customer_id: 'customer-unit', customer_link_status: 'manually_linked' }, options.conversationError);
      throw new Error(`Unexpected write or customer lookup: ${table}`);
    }),
  };
}

afterEach(() => vi.restoreAllMocks());

describe('Recebimento/reabertura — contrato unitário, sem PostgreSQL', () => {
  it('entrega mensagem e mídia à única RPC, sem gravar estado ou evento no JavaScript', async () => {
    const supabase = client();
    const result = await processWhatsAppWebhookPayload(supabase as never, payload);
    expect(result).toMatchObject({ processedMessages: 1, duplicatesIgnored: 0, errors: [] });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('customer_support_receive_message', {
      p_business_phone_number_id: 'channel-unit', p_contact_wa_id: '5511999990000',
      p_contact_phone: '+5511999990000', p_contact_name: 'Contato unitário',
      p_customer_id: null, p_customer_link_status: 'unlinked',
      p_message: { api_message_id: 'wamid.unit-inbound', message_type: 'image', text_content: 'Legenda',
        media_id: 'media-unit', media_mime_type: 'image/jpeg', media_filename: null, media_caption: 'Legenda',
        reply_to_wamid: 'wamid.unit-reply', timestamp: new Date(1792580000 * 1000).toISOString() },
    });
    expect(supabase.from.mock.calls.map(([table]) => table)).toEqual(['whatsapp_messages', 'whatsapp_conversations']);
  });

  it('contabiliza duplicata detectada no servidor depois da consulta inicial', async () => {
    const result = await processWhatsAppWebhookPayload(client({ inserted: false }) as never, payload);
    expect(result).toMatchObject({ processedMessages: 0, duplicatesIgnored: 1, errors: [] });
  });

  it('confirma a identidade na RPC mesmo quando a consulta rápida encontrou o ID, sem repetir matching', async () => {
    const supabase = client({ existingMessage: true, inserted: false });
    const result = await processWhatsAppWebhookPayload(supabase as never, payload);
    expect(result).toMatchObject({ processedMessages: 0, duplicatesIgnored: 1, errors: [] });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('customer_support_receive_message', expect.objectContaining({
      p_business_phone_number_id: 'channel-unit', p_contact_wa_id: '5511999990000',
      p_message: expect.objectContaining({ api_message_id: 'wamid.unit-inbound' }),
    }));
    expect(supabase.from.mock.calls.map(([table]) => table)).toEqual(['whatsapp_messages']);
  });

  it('não mascara conflito entre canais/contatos como duplicata pela consulta rápida', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const supabase = client({ existingMessage: true, error: { code: '23505', message: 'Identidade da mensagem recebida conflitante.' } });
    const result = await processWhatsAppWebhookPayload(supabase as never, payload);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ processedMessages: 0, duplicatesIgnored: 0 });
    expect(result.errors).toEqual(['Identidade da mensagem recebida conflitante.']);
  });

  it.each([
    { error: { code: '23505', message: 'Conflito de identidade.' } },
    { receipt: null },
    { receipt: { conversation_id: 'conv-unit', message_id: 'msg-unit' } },
    { lookupError: { message: 'Leitura de duplicata indisponível.' } },
    { conversationError: { message: 'Leitura da conversa indisponível.' } },
  ])('não informa sucesso nem faz fallback para gravações separadas: %j', async (options) => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const supabase = client(options);
    const result = await processWhatsAppWebhookPayload(supabase as never, payload);
    expect(result.processedMessages).toBe(0);
    expect(result.duplicatesIgnored).toBe(0);
    expect(result.errors).toHaveLength(1);
    if ('lookupError' in options || 'conversationError' in options) expect(supabase.rpc).not.toHaveBeenCalled();
  });
});

describe('Proposta SQL de reabertura — inspeção estática, não prova de transação/RLS', () => {
  const sql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-inbound-reopening.sql', import.meta.url), 'utf8');

  it('limita a função ao servidor e mantém os dois estados elegíveis', () => {
    expect(sql).toContain("SECURITY INVOKER SET search_path = ''");
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;');
    expect(sql).toContain('TO service_role;');
    expect(sql).toContain("v_reopened := v_previous_status <> 'open';");
    expect(sql).toContain("'status:closed'");
    expect(sql).toContain("'status:snoozed'");
    expect(sql).not.toMatch(/SECURITY DEFINER|\bassigned_to\s*=|\bDROP\b|\bTRUNCATE\b/);
  });

  it('posiciona a saída de duplicata antes do resumo/estado/evento e usa o bloqueio da conversa', () => {
    const duplicateExit = sql.indexOf('IF v_message_id IS NULL THEN');
    expect(sql.indexOf('FOR UPDATE;')).toBeLessThan(duplicateExit);
    expect(duplicateExit).toBeLessThan(sql.indexOf('UPDATE public.whatsapp_conversations SET'));
    expect(sql.indexOf('UPDATE public.whatsapp_conversations SET')).toBeLessThan(sql.indexOf('IF v_reopened THEN'));
    expect(sql).toContain('ON CONFLICT (api_message_id) DO NOTHING');
    expect(sql).toContain("'source_message_id', v_message_id");
    expect(sql.match(/INSERT INTO public.whatsapp_messages/g)).toHaveLength(2);
  });

  it('soma não lidas no banco e conserva resumo/datas mais recentes em mensagens fora de ordem', () => {
    expect(sql).toContain('unread_count = unread_count + 1');
    expect(sql).toContain('last_message_at = greatest(last_message_at, v_timestamp)');
    expect(sql).toContain('last_customer_message_at = greatest(last_customer_message_at, v_timestamp)');
    expect(sql).toContain('CASE WHEN v_timestamp >= last_message_at THEN');
    expect(sql).toContain("customer_link_status <> 'manually_linked'");
    expect(sql).not.toMatch(/net\.http|http_post|whatsapp_dispatches|UPDATE public\.orders/);
  });
});

describe('Proposta das guardas de reabertura — inspeção estática, sem DML', () => {
  const sql = readFileSync(new URL('../../../../../../docs/integracoes/sql/customer-support-reopening-test-guards.sql', import.meta.url), 'utf8');

  it('preserva os três corpos completos e a expressão de identidade sem encerramento duplicado', () => {
    expect(sql.match(/^\$function\$;\r?$/gm)).toHaveLength(3);
    expect(sql).toContain("OR coalesce(v_meta->>'scenarioKey', '') !~ '^[a-z][a-z0-9_-]{2,63}$'\n".trimEnd());
    expect(sql).not.toMatch(/\$function\$;\s+OR /);
  });

  it('mantém ownership real, reserva de limpeza e os limites dos cenários anteriores', () => {
    expect(sql).toContain('public.assert_test_artifact_identity(v_meta)');
    expect(sql).toContain('v_limit integer := 202;');
    expect(sql).toContain("v_reopening_fixture := v_meta->>'scenarioKey'='support-reopening';");
    expect(sql).toContain('v_limit := 68;');
    expect(sql).toContain('v_message_count >= 63 AND NOT coalesce((');
    expect(sql).toContain('business_phone_number_id=v_business) > 5');
    expect(sql).not.toMatch(/DISABLE TRIGGER|DISABLE ROW LEVEL SECURITY|CREATE TABLE|CREATE SCHEMA|SET ROLE|set_config\(/i);
  });

  it('vincula o primeiro contato a uma âncora própria persistida e o evento à mensagem recebida', () => {
    expect(sql).toContain("m.raw_payload#>>'{testArtifact,ownerId}'=auth.uid()::text");
    expect(sql).toContain("c.contact_wa_id='reopening:' || (v_root_payload#>>'{testArtifact,runId}') || ':new'");
    expect(sql).toContain("source.raw_payload->'testArtifact'=v_meta");
    expect(sql).toContain("NEW.api_message_id NOT LIKE 'test-reopen:' || (v_identity->>'runId') || ':%'");
    expect(sql).toContain("NEW.raw_payload->>'author_name' IS DISTINCT FROM 'Sistema'");
  });

  it('usa o processador compartilhado antes da falha controlada e não libera escrita direta', () => {
    const call = sql.indexOf('v_receipt := public.customer_support_receive_message(');
    const failure = sql.indexOf("RAISE EXCEPTION 'SUPPORT_TEST_CONTROLLED_ROLLBACK'");
    expect(call).toBeGreaterThan(0);
    expect(failure).toBeGreaterThan(call);
    expect(sql).toContain('coalesce(public.is_administrator(), false)');
    expect(sql).toContain('FROM PUBLIC, anon, service_role;');
    expect(sql).not.toMatch(/GRANT INSERT|GRANT UPDATE|whatsapp_dispatches|net\.http|UPDATE public\.orders/);
  });
});
