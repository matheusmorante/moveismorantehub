import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ login: vi.fn(), google: vi.fn(), send: vi.fn(), verify: vi.fn(), update: vi.fn(), reauth: vi.fn(), begin: vi.fn(), end: vi.fn(), logout: vi.fn(), alert: vi.fn() }));
vi.mock('react-native', () => ({
  View: ({ children }: any) => <div>{children}</div>, Text: ({ children }: any) => <span>{children}</span>, ActivityIndicator: () => <span>Processando</span>, KeyboardAvoidingView: ({ children }: any) => <div>{children}</div>, ScrollView: ({ children }: any) => <div>{children}</div>,
  Modal: ({ children, visible }: any) => visible ? <div>{children}</div> : null,
  TouchableOpacity: ({ onPress, children, disabled, accessibilityLabel }: any) => <button onClick={onPress} disabled={disabled} aria-label={accessibilityLabel}>{children}</button>,
  TextInput: ({ value, onChangeText, onSubmitEditing, accessibilityLabel, placeholder, editable }: any) => <input value={value ?? ''} disabled={editable === false} aria-label={accessibilityLabel} placeholder={placeholder} onChange={(e) => onChangeText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') onSubmitEditing?.(); }} />,
  StyleSheet: { create: (value: unknown) => value }, Platform: { OS: 'web' }, Alert: { alert: mocks.alert },
}));
vi.mock('lucide-react-native', () => ({ Lock: () => null, Mail: () => null, ShieldAlert: () => null, X: () => null }));
vi.mock('expo-web-browser', () => ({ openAuthSessionAsync: vi.fn() }));
vi.mock('react-native-svg', () => ({ default: ({ children }: any) => <div>{children}</div>, Path: () => null }));
vi.mock('../../../mobile/src/services/supabaseClient', () => ({ supabase: {} }));
vi.mock('../../../mobile/src/contexts/AuthContext', () => ({ useAuth: () => ({ beginPasswordRecovery: mocks.begin, endPasswordRecovery: mocks.end, handleLogout: mocks.logout }) }));
vi.mock('../../../mobile/src/services/googleAuth', () => ({ completeGoogleSignIn: vi.fn(), getGoogleAuthRedirectUrl: () => 'https://example.test/auth' }));
vi.mock('../../../mobile/src/services/authPasswordSetup', () => ({ signInWithEmailPassword: mocks.login, signInWithGoogle: mocks.google }));
vi.mock('../../../mobile/src/services/authPasswordRecovery', () => ({
  requestPasswordRecoveryCode: mocks.send, verifyPasswordRecoveryCode: mocks.verify,
  updateAuthenticatedPassword: mocks.update, requestPasswordChangeReauthentication: mocks.reauth,
  isCurrentPasswordRequired: (error: any) => error.code === 'current', isPasswordReauthenticationRequired: (error: any) => error.code === 'reauth',
  getPasswordAuthErrorMessage: (error: any) => error.message,
}));
import { LoginScreen } from '../../../mobile/src/components/LoginScreen';
import { PasswordSetupModal } from '../../../mobile/src/components/modals/PasswordSetupModal';
import { PasswordChangeModal } from '../../../mobile/src/components/modals/PasswordChangeModal';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('__DEV__', false);
  mocks.login.mockResolvedValue({ data: { session: { user: { id: 'user' } } }, error: null });
  mocks.google.mockResolvedValue({ data: {}, error: null });
  for (const operation of [mocks.send, mocks.verify, mocks.update, mocks.reauth]) operation.mockResolvedValue({ error: null });
  mocks.logout.mockResolvedValue(undefined);
});
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const recover = async () => {
  render(<LoginScreen isDarkMode={false} onLoginSuccess={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  edit('E-mail para recuperação', '  Teste@example.test  ');
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
  await screen.findByLabelText('Código de recuperação');
};

describe('proprietários móveis de autenticação com resolver real', () => {
  it('libera a tela no prazo local sem repetir login nem aplicar sucesso tardio', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.login.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const success = vi.fn(); render(<LoginScreen isDarkMode={false} onLoginSuccess={success} />);
    edit('E-mail', 'teste@example.test'); edit('Senha', 'senha');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Entrar' })); await vi.advanceTimersByTimeAsync(20_001); });
    expect(screen.getByText(/Confira o estado da sua conta/)).toBeDefined(); expect(screen.getByRole('button', { name: 'Entrar' })).toBeDefined();
    await act(async () => { finish({ data: { session: { user: { id: 'late' } } }, error: null }); });
    expect(success).not.toHaveBeenCalled(); expect(mocks.login).toHaveBeenCalledTimes(1);
  });
  it('bloqueia e-mail inválido antes do login e aceita senha legada sem aparar espaços', async () => {
    const success = vi.fn(); render(<LoginScreen isDarkMode={false} onLoginSuccess={success} />);
    edit('E-mail', 'inválido'); edit('Senha', ' x '); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await screen.findByText('Informe um e-mail válido.'); expect(mocks.login).not.toHaveBeenCalled();
    edit('E-mail', '  Teste@example.test  '); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1)); expect(mocks.login).toHaveBeenCalledWith({}, 'Teste@example.test', ' x ');
  });
  it('bloqueia login repetido e Google enquanto autentica, permitindo retomar após erro', async () => {
    let finish!: (value: unknown) => void;
    mocks.login.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const success = vi.fn(); render(<LoginScreen isDarkMode={false} onLoginSuccess={success} />);
    edit('E-mail', 'teste@example.test'); edit('Senha', 'senha');
    const google = screen.getByRole('button', { name: /Google/i });
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Entrar' })); fireEvent.keyDown(screen.getByLabelText('Senha'), { key: 'Enter' }); fireEvent.click(google); });
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1)); expect(mocks.google).not.toHaveBeenCalled();
    await act(async () => { finish({ data: { session: null }, error: { message: 'Falha simulada' } }); });
    await screen.findByText('Falha simulada'); fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await waitFor(() => expect(success).toHaveBeenCalledTimes(1)); expect(mocks.login).toHaveBeenCalledTimes(2);
  });
  it('rejeita recuperação inválida e mantém o envio protegido até concluir', async () => {
    let finish!: (value: unknown) => void; mocks.send.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<LoginScreen isDarkMode={false} onLoginSuccess={vi.fn()} />); fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    edit('E-mail para recuperação', 'inválido'); fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
    await screen.findByText('Informe um e-mail válido.'); expect(mocks.send).not.toHaveBeenCalled();
    edit('E-mail para recuperação', '  teste@example.test '); const submit = screen.getByRole('button', { name: 'Enviar código' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); fireEvent.click(screen.getByRole('button', { name: 'Voltar ao login' })); });
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(1)); expect(mocks.send).toHaveBeenCalledWith({}, 'teste@example.test');
    await act(async () => { finish({ error: null }); }); await screen.findByLabelText('Código de recuperação');
  });
  it('valida código e senha separadamente e aguarda verificação e atualização', async () => {
    await recover();
    expect(screen.getByRole('button', { name: 'Validar código' })).toHaveProperty('disabled', true); expect(mocks.verify).not.toHaveBeenCalled();
    edit('Código de recuperação', ' 123456 ');
    let verify!: (value: unknown) => void; mocks.verify.mockImplementationOnce(() => new Promise((resolve) => { verify = resolve; }));
    const submit = screen.getByRole('button', { name: 'Validar código' }); act(() => { fireEvent.click(submit); fireEvent.click(submit); });
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledTimes(1)); expect(mocks.verify).toHaveBeenCalledWith({}, 'Teste@example.test', '123456');
    await act(async () => { verify({ error: null }); }); await screen.findByLabelText('Nova senha');
    edit('Nova senha', 'curta'); edit('Confirmar nova senha', 'curta'); fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByText('A senha deve ter pelo menos 8 caracteres.'); expect(mocks.update).not.toHaveBeenCalled();
    edit('Nova senha', ' senha123 '); edit('Confirmar nova senha', ' senha123 ');
    let update!: (value: unknown) => void; mocks.update.mockImplementationOnce(() => new Promise((resolve) => { update = resolve; }));
    const save = screen.getByRole('button', { name: 'Salvar nova senha' }); act(() => { fireEvent.click(save); fireEvent.click(save); });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1)); expect(mocks.update).toHaveBeenCalledWith({}, ' senha123 '); expect(mocks.logout).not.toHaveBeenCalled();
    await act(async () => { update({ error: null }); }); await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1)); expect(mocks.end).toHaveBeenCalledTimes(1);
  });
  it('não cria senha inválida e aguarda o callback de criação antes de limpar campos', async () => {
    let fail!: (error: Error) => void;
    const create = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined);
    render(<PasswordSetupModal visible status="required" onCreatePassword={create} onLogout={vi.fn()} />);
    edit('Nova senha', 'curta'); edit('Confirmar senha', 'curta'); fireEvent.click(screen.getByRole('button', { name: 'Criar senha' }));
    await screen.findByText('A senha deve ter pelo menos 8 caracteres.'); expect(create).not.toHaveBeenCalled();
    edit('Nova senha', ' senha123 '); edit('Confirmar senha', ' senha123 ');
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Criar senha' })); fireEvent.keyDown(screen.getByLabelText('Confirmar senha'), { key: 'Enter' }); });
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1)); expect(create).toHaveBeenCalledWith(' senha123 ', ' senha123 ');
    await act(async () => { fail(new Error('Falha simulada')); }); await screen.findByText('Falha simulada');
    expect(screen.getByLabelText('Nova senha')).toHaveProperty('value', ' senha123 ');
    fireEvent.click(screen.getByRole('button', { name: 'Criar senha' })); await waitFor(() => expect(screen.getByLabelText('Nova senha')).toHaveProperty('value', '')); expect(create).toHaveBeenCalledTimes(2);
  });
  it('protege saída da criação de senha contra gravação concorrente e mostra falha', async () => {
    let fail!: (error: Error) => void;
    const logout = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; })).mockResolvedValue(undefined); const create = vi.fn();
    render(<PasswordSetupModal visible status="required" onCreatePassword={create} onLogout={logout} />);
    edit('Nova senha', 'senha1234'); edit('Confirmar senha', 'senha1234');
    const leave = screen.getByRole('button', { name: /Sair/ });
    act(() => { fireEvent.click(leave); fireEvent.keyDown(screen.getByLabelText('Confirmar senha'), { key: 'Enter' }); fireEvent.click(leave); });
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1)); expect(create).not.toHaveBeenCalled();
    await act(async () => { fail(new Error('Falha ao sair')); }); await screen.findByText('Falha ao sair');
    fireEvent.click(leave); await waitFor(() => expect(logout).toHaveBeenCalledTimes(2));
  });
  it('valida requisitos dinâmicos de senha atual sem liberar submissão concorrente', async () => {
    const close = vi.fn(); render(<PasswordChangeModal visible isDarkMode={false} onClose={close} />);
    edit('Nova senha', 'senha1234'); edit('Confirmar senha', 'diferente'); fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByText('As senhas não coincidem.'); expect(mocks.update).not.toHaveBeenCalled();
    mocks.update.mockResolvedValueOnce({ error: { code: 'current', message: 'Senha atual necessária' } });
    edit('Confirmar senha', 'senha1234'); fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' })); await screen.findByLabelText('Senha atual');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' })); await screen.findByText('Informe sua senha atual para continuar.'); expect(mocks.update).toHaveBeenCalledTimes(1);
    edit('Senha atual', ' atual '); let finish!: (value: unknown) => void; mocks.update.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' })); fireEvent.keyDown(screen.getByLabelText('Confirmar senha'), { key: 'Enter' }); });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2)); expect(mocks.update).toHaveBeenLastCalledWith({}, 'senha1234', undefined, ' atual '); expect(close).not.toHaveBeenCalled();
    await act(async () => { finish({ error: null }); }); await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  });
  it('mantém desafio de código separado do formulário de atualização e protege o reenvio', async () => {
    mocks.update.mockResolvedValueOnce({ error: { code: 'reauth', message: 'Código necessário' } });
    const close = vi.fn(); render(<PasswordChangeModal visible isDarkMode={false} onClose={close} />);
    edit('Nova senha', 'senha1234'); edit('Confirmar senha', 'senha1234'); fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await screen.findByLabelText('Código de confirmação'); expect(mocks.reauth).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar e alterar senha' })); await screen.findByText('Informe o código enviado para confirmar sua identidade.'); expect(mocks.update).toHaveBeenCalledTimes(1);
    let finish!: (value: unknown) => void; mocks.reauth.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' })); fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' })); fireEvent.keyDown(screen.getByLabelText('Confirmar senha'), { key: 'Enter' }); });
    await waitFor(() => expect(mocks.reauth).toHaveBeenCalledTimes(2)); expect(mocks.update).toHaveBeenCalledTimes(1);
    await act(async () => { finish({ error: null }); }); edit('Código de confirmação', ' 123456 '); fireEvent.click(screen.getByRole('button', { name: 'Confirmar e alterar senha' }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1)); expect(mocks.update).toHaveBeenLastCalledWith({}, 'senha1234', '123456', undefined);
  });
});
