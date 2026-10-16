// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultSettings } from '@/pages/utils/settings/defaults';
const mocks = vi.hoisted(() => ({ connection: vi.fn(), templates: vi.fn(), send: vi.fn(), error: vi.fn(), success: vi.fn(), user: { id: 'operator' } }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/pages/utils/whatsappGraphService', () => ({ whatsappGraphService: { testConnection: mocks.connection, fetchMessageTemplates: mocks.templates, sendTemplateMessage: mocks.send } }));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.error, error: mocks.error, info: vi.fn(), success: mocks.success } }));
import WhatsAppConfigSection from './WhatsAppConfigSection';
const settings = () => ({ ...getDefaultSettings(), whatsappConfig: { accessToken: ' token ', phoneNumberId: ' sender ', wabaId: ' waba ', catalogId: '', templateNameOrderConfirmation: ' order_template ', templateLanguage: ' pt_BR ', templateVariableCount: 0 } });
const deferred = () => { let resolve!: (value: any) => void; let reject!: (error: any) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Testar Envio' }));
const phone = () => fireEvent.change(screen.getByPlaceholderText('DDD + Número (ex: 41999999999)'), { target: { value: '(41) 99999-8888' } });
beforeEach(() => { vi.resetAllMocks(); mocks.user = { id: 'operator' }; mocks.connection.mockResolvedValue({ id: 'sender', code_verification_status: 'VERIFIED' }); mocks.templates.mockResolvedValue([]); mocks.send.mockResolvedValue({ messages: [{ id: 'wamid.test' }] }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('WhatsApp configuration submission owner', () => {
  it('executes the resolver before connection and passes parsed credentials', async () => {
    const draft = settings(); draft.whatsappConfig.accessToken = '';
    const view = render(<WhatsAppConfigSection settings={draft} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' })); await screen.findByRole('alert'); expect(mocks.connection).not.toHaveBeenCalled();
    view.rerender(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' }));
    await waitFor(() => expect(mocks.connection).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'token', phoneNumberId: 'sender' })));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
  });
  it('shares one guard across connection, query and send until the receipt', async () => {
    const pending = deferred(); mocks.connection.mockReturnValue(pending.promise);
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />); phone();
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' })); send(); fireEvent.click(screen.getByRole('button', { name: /Consultar Modelos na Conta Meta/i })); });
    await waitFor(() => expect(mocks.connection).toHaveBeenCalledOnce()); expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.templates).not.toHaveBeenCalled();
    await act(async () => { pending.resolve({ id: 'sender' }); }); expect(screen.queryByRole('status')).toBeNull();
  });
  it('sends current parsed config with the query instead of using cached account credentials', async () => {
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Consultar Modelos na Conta Meta/i }));
    await waitFor(() => expect(mocks.templates).toHaveBeenCalledWith(expect.objectContaining({ wabaId: 'waba', accessToken: 'token' })));
  });
  it('bounds read-only connection and allows an explicit later retry', async () => {
    vi.useFakeTimers(); mocks.connection.mockReturnValueOnce(new Promise(() => {}));
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' })); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/não devolveu confirmação/);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' })); });
    expect(mocks.connection).toHaveBeenCalledTimes(2); expect(mocks.success).toHaveBeenCalledOnce();
  });
  it('does not accept a connection receipt of another sender', async () => {
    mocks.connection.mockResolvedValue({ id: 'other-sender' }); render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Testar Conexão' }));
    await screen.findByRole('alert'); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('validates phone and command config before sending and preserves zero variables', async () => {
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />); send();
    await screen.findByRole('alert'); expect(mocks.send).not.toHaveBeenCalled(); phone(); send();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith('41999998888', 'order_template', [], 'pt_BR', expect.objectContaining({ accessToken: 'token', phoneNumberId: 'sender' })));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); send();
    await screen.findByRole('alert'); expect(mocks.send).toHaveBeenCalledOnce();
  });
  it('keeps a confirmed negative acknowledgement retryable', async () => {
    mocks.send.mockRejectedValueOnce(Object.assign(new Error('Modelo recusado'), { confirmedFailure: true }));
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />); phone(); send();
    await screen.findByRole('alert'); send(); await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce()); expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('treats a missing wamid as uncertain and blocks repetition', async () => {
    mocks.send.mockResolvedValue({ messages: [] }); render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />); phone(); send();
    await screen.findByRole('alert'); send(); await waitFor(() => expect(mocks.send).toHaveBeenCalledOnce()); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('bounds send wait and ignores a late confirmation', async () => {
    vi.useFakeTimers(); const pending = deferred(); mocks.send.mockReturnValue(pending.promise);
    render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />); phone();
    await act(async () => { send(); await vi.advanceTimersByTimeAsync(30_001); });
    expect(screen.getByRole('alert').textContent).toMatch(/não foi confirmado/);
    await act(async () => { pending.resolve({ messages: [{ id: 'late' }] }); send(); });
    expect(mocks.send).toHaveBeenCalledOnce(); expect(mocks.success).not.toHaveBeenCalled();
  });
  it('does not apply a query response to a different WABA or operator', async () => {
    const pending = deferred(); mocks.templates.mockReturnValue(pending.promise);
    const view = render(<WhatsAppConfigSection settings={settings()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Consultar Modelos na Conta Meta/i })); await waitFor(() => expect(mocks.templates).toHaveBeenCalledOnce());
    mocks.user = { id: 'other' }; const next = settings(); next.whatsappConfig.wabaId = 'other-waba'; view.rerender(<WhatsAppConfigSection settings={next} onChange={vi.fn()} />);
    await act(async () => { pending.resolve([{ name: 'old_template', status: 'APPROVED', language: 'pt_BR' }]); });
    expect(screen.queryByText('old_template')).toBeNull(); expect(mocks.success).not.toHaveBeenCalled();
  });
});
