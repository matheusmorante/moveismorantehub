// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChatComposer } from '../components/chat/ChatComposer';
import { EmptyChatState } from '../components/EmptyChatState';
import { UsageConsumptionModal } from '../components/UsageConsumptionModal';

const mocks = vi.hoisted(() => {
  const conversationQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  conversationQuery.select.mockReturnValue(conversationQuery);
  conversationQuery.eq.mockReturnValue(conversationQuery);

  const userDb = {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(() => conversationQuery),
  };
  const adminDb = {
    from: vi.fn((table: string) => table === 'whatsapp_messages'
      ? { insert: vi.fn().mockResolvedValue({ error: null }) }
      : { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }),
  };
  return { conversationQuery, userDb, adminDb, createClient: vi.fn() };
});

import { createWhatsAppTestDispatchHandler } from '../../../../../../api/whatsapp-dispatch';

const TEST_CONVERSATION_ID = '11111111-1111-4111-8111-111111111111';
const TEST_PHONE_ID = '1366212509919686';

function response() {
  return {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as any;
}

function request(body: unknown = {}) {
  return {
    method: 'POST',
    query: {},
    headers: { authorization: 'Bearer test-user-jwt' },
    body,
  } as any;
}

function configureDevelopmentSandbox() {
  vi.stubEnv('VERCEL_ENV', 'development');
  vi.stubEnv('MORANTE_ENV_SOURCE', 'vercel-development');
  vi.stubEnv('WHATSAPP_TEST_PHONE_NUMBER', '+15556555267');
  vi.stubEnv('WHATSAPP_TEST_PHONE_NUMBER_ID', TEST_PHONE_ID);
  vi.stubEnv('WHATSAPP_TEST_WABA_ID', '1078919214778690');
  vi.stubEnv('WHATSAPP_ACCESS_TOKEN', 'sandbox-access-token');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://unit.supabase.co');
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'unit-anon-key');
  vi.stubEnv('SUPABASE_ANON_KEY', '');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'unit-service-key');
  mocks.createClient.mockImplementation((_url: string, key: string) => key === 'unit-anon-key' ? mocks.userDb : mocks.adminDb);
  mocks.userDb.from.mockImplementation(() => mocks.conversationQuery);
  mocks.conversationQuery.select.mockReturnValue(mocks.conversationQuery);
  mocks.conversationQuery.eq.mockReturnValue(mocks.conversationQuery);
  mocks.adminDb.from.mockImplementation((table: string) => table === 'whatsapp_messages'
    ? { insert: vi.fn().mockResolvedValue({ error: null }) }
    : { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) });
  mocks.userDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'operator-id', email: 'operator@example.invalid', user_metadata: { full_name: 'Operador de teste' } } }, error: null });
  mocks.userDb.rpc.mockResolvedValue({ data: true, error: null });
  mocks.conversationQuery.maybeSingle.mockResolvedValue({ data: {
    id: TEST_CONVERSATION_ID,
    business_phone_number_id: TEST_PHONE_ID,
    contact_phone: '+5511999990000',
    last_customer_message_at: new Date().toISOString(),
  }, error: null });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ messages: [{ id: 'wamid.sandbox-test' }] }),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('envio sandbox da Central', () => {
  it('explica que Development exige conversa do sandbox e janela aberta', () => {
    render(<EmptyChatState enableDevelopmentTestMode />);
    expect(screen.getByText(/Teste sandbox: conversa do número Meta/)).toBeTruthy();
  });

  it('explica as validações de envio no modal de política', () => {
    const close = vi.fn();
    const { rerender } = render(<UsageConsumptionModal isOpen onClose={close} />);
    expect(screen.getByText('Envio controlado por permissão e janela de atendimento')).toBeTruthy();
    expect(screen.getByText(/Somente perfis autorizados podem enviar mensagens/)).toBeTruthy();

    rerender(<UsageConsumptionModal isOpen onClose={close} enableDevelopmentTestMode />);
    expect(screen.getByText(/O compositor segue as mesmas validações do ambiente de produção/)).toBeTruthy();
  });

  it('mantém o compositor visível e explica o bloqueio sem permissão', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<ChatComposer onOpenSnippets={vi.fn()} />);
    const composer = screen.getByRole('textbox', { name: 'Mensagem' });
    expect(composer).toBeTruthy();
    expect((composer as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByText('Seu perfil não tem permissão para enviar mensagens pela Central.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Gravar áudio' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Abrir menu de anexos' })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('envia apenas pela Phone Number ID sandbox, conversa aberta e atendente autorizado', async () => {
    configureDevelopmentSandbox();
    const res = response();
    const handler = createWhatsAppTestDispatchHandler({
      env: process.env,
      createClient: mocks.createClient as any,
      fetchMeta: globalThis.fetch as any,
    });
    await handler(request({ conversationId: TEST_CONVERSATION_ID, message: 'Teste sandbox' }), res);

    expect(mocks.userDb.auth.getUser).toHaveBeenCalled();
    expect(mocks.userDb.rpc).toHaveBeenCalled();
    expect(await mocks.userDb.rpc.mock.results[0].value).toEqual({ data: true, error: null });
    expect(mocks.conversationQuery.maybeSingle).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ accepted: true, persisted: true }));
    expect(res.statusCode).toBe(200);
    expect(mocks.userDb.rpc).toHaveBeenCalledWith('customer_support_can_view');
    expect(fetch).toHaveBeenCalledWith(
      `https://graph.facebook.com/v26.0/${TEST_PHONE_ID}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: '5511999990000', type: 'text', text: { body: 'Teste sandbox' } }),
      }),
    );
    expect(mocks.adminDb.from).toHaveBeenCalledWith('whatsapp_messages');
  });

  it('não despacha conversas de outro número nem fora de Development', async () => {
    configureDevelopmentSandbox();
    mocks.conversationQuery.maybeSingle.mockResolvedValueOnce({ data: {
      id: TEST_CONVERSATION_ID,
      business_phone_number_id: 'production-phone-id',
      contact_phone: '+5511999990000',
      last_customer_message_at: new Date().toISOString(),
    }, error: null });
    const blockedConversation = response();
    const handler = createWhatsAppTestDispatchHandler({
      env: process.env,
      createClient: mocks.createClient as any,
      fetchMeta: globalThis.fetch as any,
    });
    await handler(request({ conversationId: TEST_CONVERSATION_ID, message: 'Não enviar' }), blockedConversation);
    expect(blockedConversation.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();

    vi.stubEnv('VERCEL_ENV', 'production');
    const blockedEnvironment = response();
    await handler(request({ conversationId: TEST_CONVERSATION_ID, message: 'Não enviar' }), blockedEnvironment);
    expect(blockedEnvironment.statusCode).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
});
