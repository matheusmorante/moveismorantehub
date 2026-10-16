// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AttendanceVoiceInput from './AttendanceVoiceInput';
const mocks = vi.hoisted(() => ({ analyze: vi.fn(), chat: vi.fn(), save: vi.fn(), upload: vi.fn(), profile: { id: 'operator-1', full_name: 'Operador' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: mocks.profile }) }));
vi.mock('@/pages/utils/aiService', () => ({ aiService: { chat: mocks.chat } }));
vi.mock('@/pages/utils/crmIntelligenceService', () => ({ crmIntelligenceService: { analyzeCustomerIntent: mocks.analyze } }));
vi.mock('@/pages/utils/attendanceService', () => ({ attendanceService: { saveLog: mocks.save, uploadAudio: mocks.upload } }));
vi.mock('react-toastify', () => ({ toast: { warn: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock('react-number-format', () => ({ PatternFormat: ({ onValueChange, format: _format, ...props }: any) => <input {...props} onChange={(event) => onValueChange({ value: event.target.value })} /> }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function open(text = '  Cliente quer uma mesa  ', phone = '') {
  fireEvent.click(screen.getByTitle('Novo Log de Atendimento (BI)'));
  fireEvent.change(screen.getByPlaceholderText('Diga ou digite o que aconteceu no atendimento...'), { target: { value: text } });
  if (phone) fireEvent.change(screen.getByLabelText('Telefone do Cliente (Opcional)'), { target: { value: phone } });
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.profile = { id: 'operator-1', full_name: 'Operador' }; mocks.analyze.mockReset().mockResolvedValue({ intent: 'OTHER', summary: 'Mesa' });
  mocks.chat.mockReset().mockResolvedValue({ answer: '{"product":"Mesa"}' }); mocks.save.mockReset().mockResolvedValue({ id: 'log-1' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
it.each(['', 'abc', '123'])('resolver impede relato vazio ou telefone inválido %s', async (phone) => {
  render(<AttendanceVoiceInput />); open(phone ? 'Relato' : '   ', phone); fireEvent.click(screen.getByText('Enviar BI'));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(mocks.analyze).not.toHaveBeenCalled(); expect(mocks.chat).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
});
it('envia texto/telefone parseados, aguarda análise e recibo sob trava', async () => {
  const analysis = deferred<any>(), save = deferred<any>(); mocks.analyze.mockReturnValueOnce(analysis.promise); mocks.save.mockReturnValueOnce(save.promise);
  render(<AttendanceVoiceInput />); open(undefined, '(41) 99999-9999'); fireEvent.click(screen.getByText('Enviar BI'));
  await waitFor(() => expect(mocks.analyze).toHaveBeenCalledWith('41999999999', 'Cliente quer uma mesa'));
  expect((screen.getByRole('textbox', { name: 'Telefone do Cliente (Opcional)' }) as HTMLInputElement).disabled).toBe(true);
  fireEvent.click(screen.getByTitle('Limpar tudo')); fireEvent.click(screen.getByTitle('Novo Log de Atendimento (BI)')); expect(screen.getByRole('status')).toBeTruthy();
  await act(async () => { analysis.resolve({ intent: 'OTHER', summary: 'Mesa' }); }); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  expect(mocks.save.mock.calls[0][0]).toMatchObject({ transcript: 'Cliente quer uma mesa', customer_phone: '41999999999', salesperson_name: 'Operador' });
  expect(screen.getByRole('status')).toBeTruthy(); await act(async () => { save.resolve({ id: 'log-1' }); });
  await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
});
it('telefone opcional conserva BI e texto parseado no registro', async () => {
  render(<AttendanceVoiceInput />); open(); fireEvent.click(screen.getByText('Enviar BI')); await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce());
  expect(mocks.analyze).not.toHaveBeenCalled(); expect(mocks.chat.mock.calls[0][0]).toContain('RELATO: "Cliente quer uma mesa"');
  expect(mocks.save.mock.calls[0][0]).toMatchObject({ transcript: 'Cliente quer uma mesa', structured_data: { product: 'Mesa' } });
});
it('IA indisponível preserva fallback de relato bruto', async () => {
  mocks.chat.mockRejectedValueOnce(new Error('Indisponível')); render(<AttendanceVoiceInput />); open(); fireEvent.click(screen.getByText('Enviar BI'));
  await waitFor(() => expect(mocks.save).toHaveBeenCalledOnce()); expect(mocks.save.mock.calls[0][0].transcript).toBe('Cliente quer uma mesa');
});
it.each(['timeout', 'rejected', 'noAck'] as const)('gravação %s deixa erro visível e bloqueia repetição', async (kind) => {
  const pending = deferred<any>(); if (kind === 'timeout') { vi.useFakeTimers(); mocks.save.mockReturnValueOnce(pending.promise); }
  else if (kind === 'rejected') mocks.save.mockRejectedValueOnce(new Error('Conexão')); else mocks.save.mockResolvedValueOnce(null);
  render(<AttendanceVoiceInput />); open(); fireEvent.click(screen.getByText('Enviar BI'));
  if (kind === 'timeout') await act(async () => { await vi.advanceTimersByTimeAsync(20001); });
  else await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByRole('alert').textContent).toContain('Confira os atendimentos'); expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(screen.getByText('Enviar BI')); expect(mocks.save).toHaveBeenCalledOnce();
  if (kind === 'timeout') await act(async () => { pending.resolve({ id: 'late' }); });
  expect(screen.getByPlaceholderText('Diga ou digite o que aconteceu no atendimento...')).toBeTruthy();
});
it('sugestão usa contrato próprio e telefone parseado antes do evento', async () => {
  mocks.analyze.mockResolvedValueOnce({ intent: 'DESIRE', extracted_data: { product_name: ' Mesa ', customer_name: 'Cliente' } });
  const listener = vi.fn(); window.addEventListener('REGISTER_CUSTOMER_DESIRE', listener);
  try {
    render(<AttendanceVoiceInput />); open(undefined, '(41) 99999-9999'); fireEvent.click(screen.getByText('Enviar BI'));
    await waitFor(() => expect(screen.getByText('Registrar Desejo: Mesa')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Telefone do Cliente (Opcional)'), { target: { value: '123' } }); fireEvent.click(screen.getByText('Registrar Desejo: Mesa'));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy()); expect(listener).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Telefone do Cliente (Opcional)'), { target: { value: '(41) 99999-9999' } }); fireEvent.click(screen.getByText('Registrar Desejo: Mesa'));
    await waitFor(() => expect(listener).toHaveBeenCalledOnce()); expect(listener.mock.calls[0][0].detail).toMatchObject({ customer_phone: '41999999999', product_name: 'Mesa', status: 'pending' });
  } finally { window.removeEventListener('REGISTER_CUSTOMER_DESIRE', listener); }
});
it('troca de sessão impede gravação de análise anterior', async () => {
  const analysis = deferred<any>(); mocks.analyze.mockReturnValueOnce(analysis.promise);
  const view = render(<AttendanceVoiceInput />); open(undefined, '41999999999'); fireEvent.click(screen.getByText('Enviar BI')); await waitFor(() => expect(mocks.analyze).toHaveBeenCalledOnce());
  mocks.profile = { id: 'operator-2', full_name: 'Outro' }; view.rerender(<AttendanceVoiceInput />);
  await act(async () => { analysis.resolve({ intent: 'OTHER' }); }); await waitFor(() => expect(screen.queryByRole('status')).toBeNull()); expect(mocks.save).not.toHaveBeenCalled();
});
