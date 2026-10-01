// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }));

import { useAuth } from '@/context/AuthContext';
import { PasswordSetupPrompt } from './PasswordSetupPrompt';

afterEach(cleanup);

const mockPasswordCredentialStatus = (
  status: 'idle' | 'checking' | 'required' | 'configured' | 'error'
) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'test-user', email: 'test@example.invalid' },
    passwordCredentialStatus: status,
    createPasswordCredential: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuth>);
};

describe('PasswordSetupPrompt', () => {
  it.each(['idle', 'checking', 'error', 'configured'] as const)(
    'does not show the dialog while credential status is %s',
    (status) => {
      mockPasswordCredentialStatus(status);

      render(
        <MemoryRouter initialEntries={['/app']}>
          <PasswordSetupPrompt />
        </MemoryRouter>
      );

      expect(screen.queryByRole('dialog')).toBeNull();
    }
  );

  it('shows the create-password dialog only after Supabase confirms no password exists', () => {
    mockPasswordCredentialStatus('required');

    render(
      <MemoryRouter initialEntries={['/app']}>
        <PasswordSetupPrompt />
      </MemoryRouter>
    );

    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByLabelText('Nova senha')).not.toBeNull();
    expect(screen.getByLabelText('Confirmar senha')).not.toBeNull();
  });
});
