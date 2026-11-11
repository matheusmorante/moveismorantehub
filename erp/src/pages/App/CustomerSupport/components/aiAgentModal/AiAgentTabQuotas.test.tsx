// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
const saveSettings = vi.hoisted(() => vi.fn());
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc } }));
vi.mock('@/pages/utils/settings', () => ({ getSettings: () => ({}), saveSettings }));
vi.mock('@/services/apiMonitoring/apiUsageGuard', () => ({ ApiUsageGuard: { clearCache: vi.fn() } }));
import { AiAgentTabQuotas } from './AiAgentTabQuotas';

beforeEach(() => {
  rpc.mockReset(); rpc.mockResolvedValue({ data: { status: 'ALLOW' }, error: null });
  saveSettings.mockReset(); saveSettings.mockResolvedValue({ confirmed: true, cached: true });
});
afterEach(cleanup);

it('não consulta nem exibe custos e limites para um usuário não administrador', () => {
  render(<AiAgentTabQuotas isAdministrator={false} />);
  expect(screen.getByText(/somente administradores/i)).toBeTruthy();
  expect(rpc).not.toHaveBeenCalled();
});

it('permite que um administrador carregue as métricas', async () => {
  render(<AiAgentTabQuotas isAdministrator />);
  await waitFor(() => expect(rpc).toHaveBeenCalledWith('get_ai_quota_metrics'));
});

it('salva os limites por um caminho que confirma a gravação no servidor', async () => {
  render(<AiAgentTabQuotas isAdministrator />);
  fireEvent.click(screen.getByRole('button', { name: /salvar limites de ia/i }));
  await waitFor(() => expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
    aiUsageLimits: expect.objectContaining({ monthlyBudgetBRL: 30 }),
  }), { confirm: true }));
});
