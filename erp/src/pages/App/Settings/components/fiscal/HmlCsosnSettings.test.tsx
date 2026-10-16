// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HmlCsosnSettings } from './HmlCsosnSettings';
const configuration = (csosn = '103') => ({ csosn, environment: 2, model: '55', issuerCrt: '1', productionApproved: false, version: 'v1' });
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('../../../../utils/nfe/csosnConfigurationService', () => ({
  getHmlCsosnConfiguration: mocks.get,
  saveHmlCsosnConfiguration: mocks.save,
}));
describe('CSOSN nas Configurações Fiscais de homologação', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.get.mockResolvedValue(configuration());
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('carrega o padrão do servidor e permite salvar outra opção', async () => {
    mocks.save.mockResolvedValue(configuration('102'));
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
  it('awaits the real save and rejects duplicate clicks until the receipt', async () => {
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<HmlCsosnSettings />); await screen.findByText('Padrão atual: 103');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '102' } });
    const button = screen.getByRole('button', { name: 'Salvar padrão de homologação' });
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toMatch(/Confirmando/);
    await act(async () => { resolve(configuration('102')); });
    await screen.findByText('Padrão atual: 102');
  });
  it.each([{ environment: 1 }, { model: '65' }, { issuerCrt: '3' }, { productionApproved: true }])('rejects a configuration outside the HML contract: %j', async (mismatch) => {
    mocks.get.mockResolvedValue({ ...configuration(), ...mismatch });
    render(<HmlCsosnSettings />);
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Salvar padrão de homologação' })).toHaveProperty('disabled', true);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('bounds initial loading and permits a guarded reload', async () => {
    vi.useFakeTimers(); mocks.get.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce(configuration());
    render(<HmlCsosnSettings />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
    expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Tentar carregar novamente' })); });
    expect(screen.getByRole('status').textContent).toBe('Padrão atual: 103');
  });
  it('keeps uncertain writes blocked after timeout and a late receipt', async () => {
    let resolve!: (value: unknown) => void;
    mocks.save.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<HmlCsosnSettings />); await screen.findByText('Padrão atual: 103'); vi.useFakeTimers();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '102' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salvar padrão de homologação' })); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmado/);
    await act(async () => { resolve(configuration('102')); fireEvent.click(screen.getByRole('button', { name: 'Salvar padrão de homologação' })); });
    expect(mocks.save).toHaveBeenCalledTimes(1); expect(screen.queryByText('Padrão atual: 102')).toBeNull();
  });
  it('rejects a receipt of another CSOSN without declaring success', async () => {
    mocks.save.mockResolvedValue(configuration('101'));
    render(<HmlCsosnSettings />); await screen.findByText('Padrão atual: 103');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '102' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar padrão de homologação' }));
    await screen.findByRole('alert'); expect(screen.queryByText('Padrão atual: 101')).toBeNull();
  });
});
