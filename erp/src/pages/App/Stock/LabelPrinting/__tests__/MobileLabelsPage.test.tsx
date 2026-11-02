// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setSession: vi.fn(), getUser: vi.fn(), canPerform: vi.fn(), subscribe: vi.fn(),
  auth: { user: { id: 'operator-1' }, profile: { id: 'operator-1', role: 'stockist' }, loading: false, isPending: false },
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { setSession: mocks.setSession, getUser: mocks.getUser } } }));
vi.mock('@/pages/utils/permissionService', () => ({ canPerform: mocks.canPerform }));
vi.mock('@/pages/utils/settingsService', () => ({ subscribeToSettings: mocks.subscribe }));
vi.mock('../Index', () => ({ default: () => <div>Gerador autorizado</div> }));
import MobileLabelsPage from '../MobileLabelsPage';

const sessionMessage = {
  type: 'morante-label-session', accessToken: 'access-fixture', refreshToken: 'refresh-fixture', userId: 'operator-1',
};

function mount(search = '?cat=identificacao') {
  window.history.replaceState({}, '', `/mobile/etiquetas${search}`);
  return render(<MemoryRouter initialEntries={[`/mobile/etiquetas${search}`]}><MobileLabelsPage /></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).ReactNativeWebView = { postMessage: vi.fn() };
  mocks.setSession.mockResolvedValue({ data: { session: { access_token: 'access-fixture', user: { id: 'operator-1' } } }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'operator-1' } }, error: null });
  mocks.canPerform.mockReturnValue(true);
  mocks.subscribe.mockImplementation((_callback, options) => {
    options.onRemoteLoad({ confirmed: true });
    return () => {};
  });
});
afterEach(() => { cleanup(); delete (window as any).ReactNativeWebView; window.history.replaceState({}, '', '/'); });

describe('sessão e permissão da tela de etiquetas do aplicativo', () => {
  it('aguarda a sessão real e a verificação do usuário antes de abrir o gerador', async () => {
    mount();
    expect(screen.queryByText('Gerador autorizado')).toBeNull();
    act(() => window.dispatchEvent(new CustomEvent('morante-label-session', { detail: sessionMessage })));
    expect(await screen.findByText('Gerador autorizado')).toBeTruthy();
    expect(mocks.getUser).toHaveBeenCalledWith('access-fixture');
    expect(mocks.subscribe).toHaveBeenCalledOnce();
  });

  it('recusa sessão cujo usuário verificado não corresponde ao operador', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'other-user' } }, error: null });
    mount();
    act(() => window.dispatchEvent(new CustomEvent('morante-label-session', { detail: sessionMessage })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('confirmar a sessão'));
    expect(screen.queryByText('Gerador autorizado')).toBeNull();
  });

  it('não aceita parâmetros de autenticação direta no endereço', () => {
    mount('?cat=identificacao&auth_email=x&user_id=y');
    expect(screen.getByRole('alert').textContent).toContain('Não foi possível abrir');
    expect(screen.queryByText('Gerador autorizado')).toBeNull();
  });

  it('impede etiqueta de preço quando o perfil só pode imprimir identificação', async () => {
    mocks.canPerform.mockImplementation((action) => action === 'printProductIdentificationLabels');
    mount('?cat=precos');
    act(() => window.dispatchEvent(new CustomEvent('morante-label-session', { detail: sessionMessage })));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não tem acesso'));
    expect(screen.queryByText('Gerador autorizado')).toBeNull();
  });
});
