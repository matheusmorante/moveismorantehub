// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useForm } from 'react-hook-form';

const { setEnabled, toast, source } = vi.hoisted(() => ({
  setEnabled: vi.fn(),
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
  source: { enabled: false, confirmed: true, numbers: ['5511999999999'] },
}));
vi.mock('react-toastify', () => ({ toast }));
vi.mock('@/pages/utils/settings', () => ({
  useSettings: () => ({ whatsappAiAgent: { enabled: source.enabled, testPhoneNumbers: source.numbers } }),
  subscribeToSettings: (_callback: unknown, options: { onRemoteLoad: (value: { confirmed: boolean }) => void }) => {
    options.onRemoteLoad({ confirmed: source.confirmed });
    return () => {};
  },
}));
vi.mock('../services/whatsappAiAgentSettings', () => ({ setWhatsAppAiAgentEnabled: setEnabled }));

import { AiAgentTabOverview } from '../components/aiAgentModal/AiAgentTabOverview';
import { buildDefaultAiAgentFormValues } from '../components/aiAgentModal/useWhatsAppAiAgentFormDefaults';
import type { WhatsAppAiAgentFormData } from '../../../../../shared-utils/whatsappAiAgentSchemas';
import { useWhatsAppAiAgentSwitch } from './useWhatsAppAiAgentSwitch';

function AgentOverview({ administrator = true }: { administrator?: boolean }) {
  const controller = useWhatsAppAiAgentSwitch(administrator);
  const { control } = useForm<WhatsAppAiAgentFormData>({
    defaultValues: buildDefaultAiAgentFormValues(),
  });
  return <AiAgentTabOverview
    control={control}
    enabled={controller.isAiAgentEnabled}
    isAdministrator={administrator}
    isAgentStatusKnown={controller.isAgentStatusKnown}
    isTogglingAiAgent={controller.isTogglingAiAgent}
    onToggleAiAgent={controller.handleToggleAiAgent}
    phoneNumbers={source.numbers}
    phoneInput=""
    phoneError=""
    onPhoneInputChange={vi.fn()}
    onAddPhone={vi.fn()}
    onRemovePhone={vi.fn()}
  />;
}

beforeEach(() => {
  source.enabled = false;
  source.confirmed = true;
  source.numbers = ['5511999999999'];
  setEnabled.mockReset();
  setEnabled.mockResolvedValue({ confirmed: true, agent: { enabled: true } });
  vi.clearAllMocks();
});
afterEach(cleanup);

it('não ativa o agente ao abrir a central; o administrador escolhe ligá-lo manualmente', async () => {
  render(<AgentOverview />);
  const button = await screen.findByRole('button', { name: /ligar atendimento de clientes por ia/i });
  expect(setEnabled).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(false, true));
  expect(toast.success).toHaveBeenCalledTimes(1);
});

it('desabilita o controle para quem não é administrador ou não confirmou o estado remoto', () => {
  const { rerender } = render(<AgentOverview administrator={false} />);
  expect(screen.getByRole('button', { name: /somente administradores/i }).hasAttribute('disabled')).toBe(true);
  source.confirmed = false;
  rerender(<AgentOverview administrator />);
  // Recreate the hook to simulate opening the page without a confirmed read.
  cleanup();
  render(<AgentOverview />);
  expect(screen.getByRole('button', { name: /não foi possível confirmar o status/i }).hasAttribute('disabled')).toBe(true);
  expect(setEnabled).not.toHaveBeenCalled();
});

it('não informa sucesso quando o estado mudou em outra sessão', async () => {
  setEnabled.mockResolvedValue({ confirmed: false, agent: { enabled: true } });
  render(<AgentOverview />);
  fireEvent.click(await screen.findByRole('button', { name: /ligar atendimento de clientes por ia/i }));
  await waitFor(() => expect(toast.info).toHaveBeenCalledTimes(1));
  expect(toast.success).not.toHaveBeenCalled();
});

it('orienta cadastrar um número de teste antes de ligar o agente', async () => {
  source.numbers = [];
  render(<AgentOverview />);
  fireEvent.click(await screen.findByRole('button', { name: /ligar atendimento de clientes por ia/i }));
  expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/cadastre ao menos um número de teste/i));
  expect(setEnabled).not.toHaveBeenCalled();
});

it('mostra erro e não confirma ativação após falha de gravação', async () => {
  setEnabled.mockRejectedValue(new Error('sem resposta'));
  render(<AgentOverview />);
  fireEvent.click(await screen.findByRole('button', { name: /ligar atendimento de clientes por ia/i }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
  expect(toast.success).not.toHaveBeenCalled();
});

it('permite desligar manualmente mesmo sem números de teste cadastrados', async () => {
  source.enabled = true;
  source.numbers = [];
  setEnabled.mockResolvedValue({ confirmed: true, agent: { enabled: false } });
  render(<ChatHeader />);
  fireEvent.click(await screen.findByRole('button', { name: /desligar atendimento de clientes por ia/i }));
  await waitFor(() => expect(setEnabled).toHaveBeenCalledWith(true, false));
});
