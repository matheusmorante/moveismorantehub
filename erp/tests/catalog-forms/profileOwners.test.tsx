import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: null as any, loading: false }, update: vi.fn(), verify: vi.fn(), login: vi.fn(), send: vi.fn(), logout: vi.fn(), push: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: any) => <a href={href}>{children}</a> }));
vi.mock('@/hooks/use-auth', () => ({ useAuth: () => ({ ...mocks.auth, logout: mocks.logout }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/lib/supabase/client', () => ({ supabase: { auth: { updateUser: mocks.update, verifyOtp: mocks.verify, signInWithPassword: mocks.login, resetPasswordForEmail: mocks.send } } }));
vi.mock('@/components/ui/button', () => ({ Button: ({ children, asChild, variant, size, ...props }: any) => asChild ? children : <button {...props}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/label', () => ({ Label: ({ children, ...props }: any) => <label {...props}>{children}</label> }));
vi.mock('@/components/ui/card', () => Object.fromEntries(['Card', 'CardContent', 'CardDescription', 'CardHeader', 'CardTitle', 'CardFooter'].map((name) => [name, ({ children }: any) => <div>{children}</div>])));
vi.mock('@/components/ui/tabs', () => Object.fromEntries(['Tabs', 'TabsContent', 'TabsList', 'TabsTrigger'].map((name) => [name, ({ children }: any) => <div>{children}</div>])));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
import ProfilePage from '../../../digital-catalog/src/app/perfil/page';

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.auth = { loading: false, user: { id: 'user', email: ' User@example.test ', user_metadata: { full_name: 'Nome Inicial' } } };
  for (const operation of [mocks.update, mocks.verify, mocks.login, mocks.send]) operation.mockResolvedValue({ error: null });
  mocks.logout.mockResolvedValue(undefined);
});
const edit = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const formFor = (label: string) => screen.getByLabelText(label).closest('form')!;
const submit = (label: string) => fireEvent.submit(formFor(label));
const fillEmail = () => { edit('Novo E-mail', ' Novo@example.test '); edit('Confirme o Novo E-mail', ' novo@example.test '); };
const fillPassword = () => { edit('Nova Senha', ' senha '); edit('Confirme a Nova Senha', ' senha '); };
const openEmailCode = async () => { fillEmail(); submit('Novo E-mail'); await screen.findByLabelText('Código de Confirmação Recebido no E-mail'); };
const openPasswordCode = async (expectedRequests = 1) => {
  fireEvent.click(screen.getByRole('button', { name: /Esqueceu a senha atual/ }));
  await screen.findByLabelText('Código de Segurança (Recebido no e-mail)');
  await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(expectedRequests));
};

describe('proprietários do perfil do catálogo', () => {
  it('mantém a ordem dos hooks durante carregamento, chegada e saída da sessão', async () => {
    const user = mocks.auth.user; mocks.auth = { loading: true, user: null };
    const view = render(<ProfilePage />); expect(screen.getByText('Carregando seu perfil...')).toBeTruthy();
    mocks.auth = { loading: false, user }; view.rerender(<ProfilePage />);
    await waitFor(() => expect(screen.getByLabelText('Nome Completo')).toHaveProperty('value', 'Nome Inicial'));
    mocks.auth = { loading: false, user: null }; view.rerender(<ProfilePage />);
    expect(screen.getByText('Acesso Restrito')).toBeTruthy();
  });

  it('bloqueia nome vazio, normaliza o payload e protege intenções concorrentes até salvar', async () => {
    render(<ProfilePage />); edit('Nome Completo', '  '); submit('Nome Completo');
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('O nome não pode estar vazio.')); expect(mocks.update).not.toHaveBeenCalled();
    let finish!: (value: unknown) => void; mocks.update.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    edit('Nome Completo', ' Novo Nome '); act(() => { submit('Nome Completo'); submit('Nome Completo'); });
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1)); expect(mocks.update).toHaveBeenCalledWith({ data: { full_name: 'Novo Nome' } });
    fillEmail(); submit('Novo E-mail'); fireEvent.click(screen.getByRole('button', { name: /Esqueceu a senha atual/ }));
    await act(async () => {}); expect(mocks.update).toHaveBeenCalledTimes(1); expect(mocks.send).not.toHaveBeenCalled();
    await act(async () => { finish({ error: { message: 'Falha simulada' } }); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Falha simulada'));
    submit('Nome Completo'); await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Nome atualizado com sucesso!'));
  });

  it('valida mudança de e-mail e mantém a comparação com a conta atual sem diferença de caixa', async () => {
    render(<ProfilePage />); fillEmail(); edit('Confirme o Novo E-mail', 'outro@example.test'); submit('Novo E-mail');
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Os e-mails digitados não coincidem.')); expect(mocks.update).not.toHaveBeenCalled();
    edit('Novo E-mail', 'user@example.test'); edit('Confirme o Novo E-mail', 'USER@example.test'); submit('Novo E-mail');
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('O novo e-mail é idêntico ao e-mail atual.')); expect(mocks.update).not.toHaveBeenCalled();
    await openEmailCode(); expect(mocks.update).toHaveBeenCalledWith({ email: 'novo@example.test' });
    submit('Código de Confirmação Recebido no E-mail'); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe o código recebido por e-mail.')); expect(mocks.verify).not.toHaveBeenCalled();
  });

  it('preserva a alternativa OTP confirmada pelo provedor e segura a operação até sair da conta', async () => {
    render(<ProfilePage />); await openEmailCode(); edit('Código de Confirmação Recebido no E-mail', ' 123456 ');
    mocks.verify.mockResolvedValueOnce({ error: { message: 'Tipo não aceito' } });
    let finish!: () => void; mocks.logout.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    act(() => { submit('Código de Confirmação Recebido no E-mail'); submit('Código de Confirmação Recebido no E-mail'); });
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    expect(mocks.verify.mock.calls).toEqual([[{ email: 'novo@example.test', token: '123456', type: 'email_change' }], [{ email: 'novo@example.test', token: '123456', type: 'email' }]]);
    submit('Código de Confirmação Recebido no E-mail'); edit('Nome Completo', 'Outro'); submit('Nome Completo');
    await act(async () => {}); expect(mocks.verify).toHaveBeenCalledTimes(2); expect(mocks.update).toHaveBeenCalledTimes(1); expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => { finish(); }); await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/auth/login?email_updated=true'));
  });

  it('não repete OTP por timeout e ignora navegação de resposta tardia', async () => {
    render(<ProfilePage />); await openEmailCode(); edit('Código de Confirmação Recebido no E-mail', '123456');
    vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {});
    let finish!: (value: unknown) => void; mocks.verify.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await act(async () => { submit('Código de Confirmação Recebido no E-mail'); await vi.advanceTimersByTimeAsync(20_001); });
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('Confira o estado da sua conta'));
    await act(async () => { finish({ error: { message: 'Resposta tardia' } }); });
    expect(mocks.verify).toHaveBeenCalledTimes(1); expect(mocks.logout).not.toHaveBeenCalled(); expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirmar Código e Alterar E-mail' })).toHaveProperty('disabled', false);
  });

  it('valida senha atual e mantém valores parseados e a trava até a atualização terminar', async () => {
    render(<ProfilePage />); fillPassword(); submit('Senha Atual');
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Por favor, digite a sua senha atual.')); expect(mocks.login).not.toHaveBeenCalled();
    edit('Senha Atual', ' atual '); let reauthenticate!: (value: unknown) => void; let save!: (value: unknown) => void;
    mocks.login.mockImplementationOnce(() => new Promise((resolve) => { reauthenticate = resolve; })); mocks.update.mockImplementationOnce(() => new Promise((resolve) => { save = resolve; }));
    act(() => { submit('Senha Atual'); submit('Senha Atual'); }); await waitFor(() => expect(mocks.login).toHaveBeenCalledTimes(1));
    expect(mocks.login).toHaveBeenCalledWith({ email: 'User@example.test', password: ' atual ' }); expect(mocks.update).not.toHaveBeenCalled();
    await act(async () => { reauthenticate({ error: null }); }); await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ password: ' senha ' }));
    submit('Senha Atual'); fireEvent.click(screen.getByRole('button', { name: /Esqueceu a senha atual/ }));
    await act(async () => {}); expect(mocks.login).toHaveBeenCalledTimes(1); expect(mocks.send).not.toHaveBeenCalled();
    await act(async () => { save({ error: { message: 'Não salvou' } }); }); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Não salvou'));
    expect(screen.getByLabelText('Nova Senha')).toHaveProperty('value', ' senha '); submit('Senha Atual');
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Senha alterada com sucesso!')); expect(screen.getByLabelText('Senha Atual')).toHaveProperty('value', '');
  });

  it('valida o e-mail do contexto antes de enviar código ou reautenticar', async () => {
    mocks.auth.user.email = 'inválido'; render(<ProfilePage />); edit('Senha Atual', 'senha'); fillPassword(); submit('Senha Atual');
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe um e-mail válido.')); expect(mocks.login).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Esqueceu a senha atual/ })); await act(async () => {}); expect(mocks.send).not.toHaveBeenCalled();
  });

  it('valida recuperação antes de verificar e conserva a operação durante OTP e nova senha', async () => {
    render(<ProfilePage />); await openPasswordCode(); expect(mocks.send).toHaveBeenCalledWith('User@example.test');
    fillPassword(); submit('Nova Senha'); await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Informe o código recebido por e-mail.')); expect(mocks.verify).not.toHaveBeenCalled();
    edit('Código de Segurança (Recebido no e-mail)', ' 123456 '); let verify!: (value: unknown) => void; let save!: (value: unknown) => void;
    mocks.verify.mockImplementationOnce(() => new Promise((resolve) => { verify = resolve; })); mocks.update.mockImplementationOnce(() => new Promise((resolve) => { save = resolve; }));
    act(() => { submit('Nova Senha'); submit('Nova Senha'); }); await waitFor(() => expect(mocks.verify).toHaveBeenCalledTimes(1));
    expect(mocks.verify).toHaveBeenCalledWith({ email: 'User@example.test', token: '123456', type: 'recovery' });
    await act(async () => { verify({ error: null }); }); await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ password: ' senha ' }));
    submit('Nova Senha'); await act(async () => {}); expect(mocks.verify).toHaveBeenCalledTimes(1);
    await act(async () => { save({ error: null }); }); await waitFor(() => expect(screen.getByLabelText('Senha Atual')).toBeTruthy());
    expect(screen.getByLabelText('Nova Senha')).toHaveProperty('value', '');
  });

  it('mostra espera durante o envio do código e impede outras alterações até a resposta', async () => {
    let finish!: (value: unknown) => void; mocks.send.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    render(<ProfilePage />); await openPasswordCode(); expect(screen.getByText('Enviando código...')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Voltar e usar Senha Atual' })).toHaveProperty('disabled', true);
    edit('Nome Completo', 'Outro nome'); submit('Nome Completo'); fireEvent.click(screen.getByRole('button', { name: 'Sair da Conta' }));
    await act(async () => {}); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.logout).not.toHaveBeenCalled();
    await act(async () => { finish({ error: { message: 'Não enviou' } }); });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Não enviou'));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar e usar Senha Atual' }));
    await openPasswordCode(2); expect(mocks.send).toHaveBeenCalledTimes(2);
  });

  it('não anuncia saída nem navega quando o provedor devolve erro sem lançar exceção', async () => {
    mocks.logout.mockResolvedValueOnce({ error: { message: 'Não saiu' } }); render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sair da Conta' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Não saiu')); expect(mocks.push).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da Conta' })); await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  });
});
