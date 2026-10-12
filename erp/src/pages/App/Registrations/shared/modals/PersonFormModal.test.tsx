// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  isAdministrator: true,
  setIsTestArtifact: vi.fn(),
  usePersonForm: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAdministrator: mocks.isAdministrator }),
}));

vi.mock('../../../../../../../shared-utils/testArtifactContext', () => ({
  getTestArtifactContext: () => ({
    runId: '550e8400-e29b-41d4-a716-446655440000',
    ownerId: '550e8400-e29b-41d4-a716-446655440001',
  }),
}));

vi.mock('./personForm', () => ({
  usePersonForm: mocks.usePersonForm,
  PersonIdentificationSection: () => null,
  PersonEmployeeRolesSection: () => null,
  PersonContactsSection: () => null,
  PersonAddressSection: () => null,
  PersonObservationsSection: () => null,
}));

import PersonFormModal from './PersonFormModal';

describe('PersonFormModal artefato de teste', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mocks.isAdministrator = true;
    mocks.setIsTestArtifact.mockReset();
    mocks.usePersonForm.mockReset();
    mocks.usePersonForm.mockReturnValue({
      formData: {},
      setFormData: vi.fn(),
      isTestArtifact: false,
      setIsTestArtifact: mocks.setIsTestArtifact,
      canMarkTestArtifact: true,
      loading: false,
      settings: {},
      isEmployee: false,
      isAddressOpen: false,
      setIsAddressOpen: vi.fn(),
      routeUrl: '',
      toggleEmployeeRole: vi.fn(),
      handleEmployeeEmailBlur: vi.fn(),
      handleAddressChange: vi.fn(),
      handleCepBlur: vi.fn(),
      addAdditionalContact: vi.fn(),
      removeAdditionalContact: vi.fn(),
      updateAdditionalContact: vi.fn(),
      handleSubmit: vi.fn((event?: React.FormEvent) => event?.preventDefault()),
    });
  });

  it('expõe o modo autorizado e encaminha a gravação como artefato de teste', () => {
    const { getByRole } = render(
      <PersonFormModal
        isOpen
        onClose={vi.fn()}
        collectionName="customers"
        title="Novo Cliente"
      />
    );

    expect(mocks.usePersonForm).toHaveBeenCalledWith(expect.objectContaining({ canMarkTestArtifact: true }));
    const toggle = getByRole('switch', { name: 'Artefato de teste do cliente' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(mocks.setIsTestArtifact).toHaveBeenCalledWith(true);
  });
});
