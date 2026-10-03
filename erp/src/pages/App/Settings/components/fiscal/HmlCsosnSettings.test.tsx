// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HmlCsosnSettings } from './HmlCsosnSettings';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('../../../../utils/nfe/csosnConfigurationService', () => ({
  getHmlCsosnConfiguration: mocks.get,
  saveHmlCsosnConfiguration: mocks.save,
}));
describe('CSOSN nas Configurações Fiscais de homologação', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.get.mockResolvedValue({ csosn: '103' });
  });
  afterEach(cleanup);
  it('carrega o padrão do servidor e permite salvar outra opção', async () => {
    mocks.save.mockResolvedValue({ csosn: '102' });
    render(<HmlCsosnSettings />);
    const select = screen.getByLabelText(
      'CSOSN padrão da NF-e em homologação'
    ) as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('103'));
    fireEvent.change(select, { target: { value: '102' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar padrão de homologação' }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith('102'));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('102'));
  });
  it('exibe falha de leitura sem assumir um padrão no frontend', async () => {
    mocks.get.mockRejectedValue(new Error('Servidor indisponível'));
    render(<HmlCsosnSettings />);
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Servidor indisponível')
    );
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('');
  });
});
