// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, notify, getSettings } = vi.hoisted(() => ({
  rpc: vi.fn(),
  notify: vi.fn(),
  getSettings: vi.fn(() => ({ companyName: 'Morante', whatsappAiAgent: { enabled: false, testMode: true, testPhoneNumbers: [], enabledTools: [] } })),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc } }));
vi.mock('@/pages/utils/settings', () => ({ getSettings, notifySettingsSubscribers: notify, SETTINGS_KEY: 'settings-test' }));

import { saveWhatsAppAiAgentConfiguration, setWhatsAppAiAgentEnabled } from './whatsappAiAgentSettings';

beforeEach(() => { rpc.mockReset(); notify.mockReset(); localStorage.clear(); });

describe('configurações do agente de atendimento', () => {
  it('altera somente o estado solicitado e publica apenas a resposta confirmada', async () => {
    rpc.mockResolvedValue({ data: { confirmed: true, agent: { enabled: true } }, error: null });
    const result = await setWhatsAppAiAgentEnabled(false, true);
    expect(result.confirmed).toBe(true);
    expect(rpc).toHaveBeenCalledWith('update_whatsapp_ai_agent_settings', { p_expected_enabled: false, p_enabled: true });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      companyName: 'Morante', whatsappAiAgent: expect.objectContaining({ enabled: true }),
    }));
  });

  it('atualiza a interface sem repetir a alteração se outro administrador já mudou o estado', async () => {
    rpc.mockResolvedValue({ data: { confirmed: false, agent: { enabled: true } }, error: null });
    const result = await setWhatsAppAiAgentEnabled(false, true);
    expect(result.confirmed).toBe(false);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ whatsappAiAgent: expect.objectContaining({ enabled: true }) }));
  });

  it('salva as instruções sem enviar comando de ativação', async () => {
    rpc.mockResolvedValue({ data: { confirmed: true, agent: { enabled: false, systemPrompt: 'Olá' } }, error: null });
    await saveWhatsAppAiAgentConfiguration({ testMode: true, testPhoneNumbers: [], enabledTools: [], systemPrompt: 'Olá' });
    expect(rpc).toHaveBeenCalledWith('update_whatsapp_ai_agent_settings', {
      p_configuration: { testMode: true, testPhoneNumbers: [], enabledTools: [], systemPrompt: 'Olá' },
    });
  });

  it('não publica estado de sucesso se a gravação falhar ou o retorno for inválido', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    await expect(setWhatsAppAiAgentEnabled(false, true)).rejects.toThrow(/não foi confirmada/i);
    rpc.mockResolvedValueOnce({ data: { confirmed: true }, error: null });
    await expect(setWhatsAppAiAgentEnabled(false, true)).rejects.toThrow(/não confirmou/i);
    expect(notify).not.toHaveBeenCalled();
    expect(localStorage.getItem('settings-test')).toBeNull();
  });
});
