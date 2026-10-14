// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from './index';
import Signup from '../Signup';

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(), signUp: vi.fn(), warning: vi.fn(), navigate: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { auth: { signUp: mocks.signUp } } }));
vi.mock('@/services/authPasswordSetup', () => ({
  signInWithEmailPassword: mocks.signIn, signInWithGoogle: vi.fn(),
}));
vi.mock('react-toastify', () => ({ toast: { warning: mocks.warning, success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(), useNavigate: () => mocks.navigate,
}));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ error: null });
});

function fill(view: ReturnType<typeof render>, placeholder: string, value: string) {
  fireEvent.change(view.getByPlaceholderText(placeholder), { target: { value } });
}
function submit(view: ReturnType<typeof render>) {
  fireEvent.submit(view.container.querySelector('form')!);
}

describe('auth form resolver submission', () => {
  it('blocks invalid login even when submitted without native browser validation', async () => {
    const view = render(<MemoryRouter><Login /></MemoryRouter>);
    fill(view, 'exemplo@email.com', 'invalid');
    fill(view, '••••••••', 'secret');
    submit(view);
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('Informe um e-mail válido.'));
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it('passes parsed email and preserves legacy short login passwords', async () => {
    const view = render(<MemoryRouter><Login /></MemoryRouter>);
    fill(view, 'exemplo@email.com', ' person@example.com ');
    fill(view, '••••••••', 'x');
    submit(view);
    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith(expect.anything(), 'person@example.com', 'x'));
  });

  it('blocks mismatched signup passwords before signup', async () => {
    const view = render(<MemoryRouter><Signup /></MemoryRouter>);
    fill(view, 'Seu nome', 'Person');
    fill(view, 'exemplo@email.com', 'person@example.com');
    fill(view, 'Min 6', 'secret');
    fill(view, 'Confirme', 'different');
    submit(view);
    await waitFor(() => expect(mocks.warning).toHaveBeenCalledWith('As senhas não coincidem!'));
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('sends parsed signup values and keeps pending account role', async () => {
    const view = render(<MemoryRouter><Signup /></MemoryRouter>);
    fill(view, 'Seu nome', ' Person ');
    fill(view, 'exemplo@email.com', ' person@example.com ');
    fill(view, 'Min 6', 'secret');
    fill(view, 'Confirme', 'secret');
    submit(view);
    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: 'person@example.com', password: 'secret',
      options: expect.objectContaining({ data: { full_name: 'Person', role: 'pending' } }),
    })));
  });
});
