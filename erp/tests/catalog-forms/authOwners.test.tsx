import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ login: vi.fn(), send: vi.fn(), verify: vi.fn(), updatePassword: vi.fn(), signup: vi.fn(), updateProfile: vi.fn(), eq: vi.fn(), push: vi.fn(), refresh: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }), signInWithPassword: mocks.login, resetPasswordForEmail: mocks.send, verifyOtp: mocks.verify, updateUser: mocks.updatePassword, signUp: mocks.signup },
  from: () => ({ update: mocks.updateProfile }),
} }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, ...props }: any) => <button {...props}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/label', () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }));
vi.mock('@/components/ui/card', () => Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle', 'CardFooter'].map((name) => [name, ({ children }: any) => <div>{children}</div>])));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div role="dialog">{children}</div> : null,
  ...Object.fromEntries(['DialogContent', 'DialogDescription', 'DialogHeader', 'DialogTitle'].map((name) => [name, ({ children }: any) => <div>{children}</div>])),
}));
import LoginPage from '../../../digital-catalog/src/app/auth/login/page';
import SignupPage from '../../../digital-catalog/src/app/auth/signup/page';
afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks();
  for (const operation of [mocks.login, mocks.send, mocks.verify, mocks.updatePassword]) operation.mockResolvedValue({ error: null });
  mocks.signup.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
  mocks.updateProfile.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockResolvedValue({ error: null });
});
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const formFor = (label: string) => screen.getByLabelText(label).closest('form')!;
const openRecovery = () => { fireEvent.click(screen.getByRole('button', { name: 'Esqueceu a senha?' })); edit('E-mail Cadastrado', '  Teste@example.test  '); };
const fillSignup = () => {
  for (const [label, value] of [['Nome', '  Nome  '], ['Sobrenome', '  Sobrenome  '], ['Celular (WhatsApp)', '  41999999999  '], ['E-mail', '  Teste@example.test  '], ['Senha', ' senha ']]) edit(label, value);
};

describe('proprietários de autenticação do catálogo', () => {
  it('encerra espera de login sem reenvio nem navegação por resposta tardia', async () => {
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.login.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<LoginPage />); edit('E-mail', 'teste@example.test'); edit('Senha', 'senha');
    await act(async () => { fireEvent.submit(formFor('E-mail')); await vi.advanceTimersByTimeAsync(20_001); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Confira o estado da sua conta'));
    await act(async () => { finish({ error: null }); }); expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Entrar/ })).toHaveProperty('disabled', false);
  });
  it('bloqueia login inválido e usa email parseado com senha legada intacta', async () => {
    render(<LoginPage />); edit('E-mail', 'inválido'); edit('Senha', ' x '); fireEvent.submit(formFor('E-mail'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe um e-mail válido.')); expect(mocks.login).not.toHaveBeenCalled();
    edit('E-mail', '  Teste@example.test  '); fireEvent.submit(formFor('E-mail'));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/')); expect(mocks.login).toHaveBeenCalledWith({ email: 'Teste@example.test', password: ' x ' });
  });
  it('protege login pendente contra repetição e pedido de recuperação concorrente', async () => {
    let finish!: (value: unknown) => void; mocks.login.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<LoginPage />); edit('E-mail', 'teste@example.test'); edit('Senha', 'senha');
    const form = formFor('E-mail'); act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1)); openRecovery(); fireEvent.submit(formFor('E-mail Cadastrado'));
    await act(async () => {}); expect(mocks.send).not.toHaveBeenCalled();
    await act(async () => { finish({ error: { message: 'Falha simulada' } }); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    fireEvent.submit(form); await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(2));
  });
  it('valida recuperação antes do envio e usa e-mail parseado na etapa seguinte', async () => {
    render(<LoginPage />); openRecovery(); edit('E-mail Cadastrado', 'inválido'); fireEvent.submit(formFor('E-mail Cadastrado'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe um e-mail válido.')); expect(mocks.send).not.toHaveBeenCalled();
    edit('E-mail Cadastrado', '  Teste@example.test  '); fireEvent.submit(formFor('E-mail Cadastrado'));
    await screen.findByLabelText('Nova Senha'); expect(mocks.send).toHaveBeenCalledWith('teste@example.test');
    edit('Código Recebido no E-mail', ' 123456 '); edit('Nova Senha', 'senha'); edit('Confirme a Nova Senha', 'senha'); fireEvent.submit(formFor('Nova Senha'));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('A nova senha deve ter no mínimo 6 caracteres.')); expect(mocks.verify).not.toHaveBeenCalled();
    edit('Nova Senha', ' senha '); edit('Confirme a Nova Senha', ' senha '); fireEvent.submit(formFor('Nova Senha'));
    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith({ password: ' senha ' })); expect(mocks.verify).toHaveBeenCalledWith({ email: 'teste@example.test', token: '123456', type: 'recovery' });
  });
  it('mantém recuperação protegida durante OTP e alteração, permitindo retomar após erro', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<LoginPage />); openRecovery(); fireEvent.submit(formFor('E-mail Cadastrado')); await screen.findByLabelText('Nova Senha');
    edit('Código Recebido no E-mail', '123456'); edit('Nova Senha', 'senha123'); edit('Confirme a Nova Senha', 'senha123');
    let finishVerify!: (value: unknown) => void; mocks.verify.mockImplementationOnce(() => new Promise((resolve) => { finishVerify = resolve; }));
    let finishPassword!: (value: unknown) => void; mocks.updatePassword.mockImplementationOnce(() => new Promise((resolve) => { finishPassword = resolve; }));
    const form = formFor('Nova Senha'); act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledTimes(1)); expect(mocks.updatePassword).not.toHaveBeenCalled();
    await act(async () => { finishVerify({ error: null }); }); await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledTimes(1));
    fireEvent.submit(form); await act(async () => {}); expect(mocks.verify).toHaveBeenCalledTimes(1);
    await act(async () => { finishPassword({ error: { message: 'Falha simulada' } }); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    fireEvent.submit(form); await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledTimes(2));
  });
  it('bloqueia cadastro inválido e envia nome e contatos parseados ao perfil', async () => {
    render(<SignupPage />); fireEvent.submit(formFor('Nome')); await waitFor(() => expect(mocks.error).toHaveBeenCalled()); expect(mocks.signup).not.toHaveBeenCalled();
    fillSignup(); fireEvent.submit(formFor('Nome'));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/auth/login'));
    expect(mocks.signup).toHaveBeenCalledWith({ email: 'Teste@example.test', password: ' senha ' });
    expect(mocks.updateProfile).toHaveBeenCalledWith({ first_name: 'Nome', last_name: 'Sobrenome', phone: '41999999999', address: '', complement: '', zip_code: '' }); expect(mocks.eq).toHaveBeenCalledWith('id', 'user');
  });
  it('mantém a trava do cadastro até terminar o perfil', async () => {
    let finish!: (value: unknown) => void; mocks.eq.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<SignupPage />); fillSignup(); const form = formFor('Nome'); act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    await waitFor(() => expect(mocks.eq).toHaveBeenCalledTimes(1)); fireEvent.submit(form); await act(async () => {});
    expect(mocks.signup).toHaveBeenCalledTimes(1); expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => { finish({ error: null }); }); await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/auth/login'));
  });
});
