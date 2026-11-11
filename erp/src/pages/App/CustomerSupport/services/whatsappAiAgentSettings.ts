import { z } from 'zod';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings, notifySettingsSubscribers, SETTINGS_KEY } from '@/pages/utils/settings';
import type { WhatsAppAiAgentConfig } from '@/pages/utils/settings/types';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

const resultSchema = z.object({
  confirmed: z.boolean(),
  agent: z.object({ enabled: z.boolean() }).passthrough(),
});

type AgentConfiguration = Omit<WhatsAppAiAgentConfig, 'enabled'>;

async function updateAgentSettings(params: {
  p_expected_enabled?: boolean;
  p_enabled?: boolean;
  p_configuration?: AgentConfiguration;
}) {
  const response = await withTimeout(
    supabase.rpc('update_whatsapp_ai_agent_settings', params),
    20_000,
    null,
    'central:salvar-agente',
  );
  if (!response || response.error) {
    throw new Error('A alteração não foi confirmada. Confira o status antes de tentar novamente.');
  }
  const parsed = resultSchema.safeParse(response.data);
  if (!parsed.success) {
    throw new Error('O servidor não confirmou o estado do agente. Confira antes de tentar novamente.');
  }

  // Publish only the returned agent fields. Do not upload a stale copy of all ERP settings.
  const current = getSettings();
  const settings = {
    ...current,
    whatsappAiAgent: { ...current.whatsappAiAgent, ...parsed.data.agent } as WhatsAppAiAgentConfig,
  };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* The server response is authoritative. */ }
  notifySettingsSubscribers(settings);
  return parsed.data;
}

export function setWhatsAppAiAgentEnabled(expectedEnabled: boolean, enabled: boolean) {
  return updateAgentSettings({ p_expected_enabled: expectedEnabled, p_enabled: enabled });
}

export function saveWhatsAppAiAgentConfiguration(configuration: AgentConfiguration) {
  return updateAgentSettings({ p_configuration: configuration });
}
