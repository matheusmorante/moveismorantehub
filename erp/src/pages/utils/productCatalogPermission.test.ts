import { describe, expect, it } from 'vitest';
import {
  getProductCatalogMutationFailureNotice,
  getProductCatalogPermissionDenialMessage,
} from '../../../../shared-utils/productCatalogPermission';

describe('getProductCatalogPermissionDenialMessage', () => {
  it('preserves the database permission message for SQLSTATE 42501', () => {
    expect(
      getProductCatalogPermissionDenialMessage({
        code: '42501',
        message: 'Seu perfil não possui permissão para alterar o Catálogo Digital.',
      })
    ).toBe('Seu perfil não possui permissão para alterar o Catálogo Digital.');
  });

  it('provides a safe fallback when the permission error has no message', () => {
    expect(getProductCatalogPermissionDenialMessage({ code: '42501' })).toBe(
      'Seu perfil não possui permissão para alterar o Catálogo Digital.'
    );
  });

  it('does not classify unrelated failures as permission denials', () => {
    expect(getProductCatalogPermissionDenialMessage({ code: 'PGRST116', message: 'Not found' })).toBeNull();
    expect(getProductCatalogPermissionDenialMessage(new Error('network failed'))).toBeNull();
  });
});

describe('getProductCatalogMutationFailureNotice', () => {
  it('asks the operator to refresh instead of claiming a multi-step mutation made no changes', () => {
    expect(getProductCatalogMutationFailureNotice(new Error('network failed'))).toEqual({
      title: 'Não foi possível confirmar a alteração',
      message:
        'Não foi possível confirmar o resultado da alteração no Catálogo Digital. Atualize a lista antes de tentar novamente.',
    });
  });

  it('keeps the explicit permission-denied message', () => {
    expect(
      getProductCatalogMutationFailureNotice({
        code: '42501',
        message: 'Seu perfil não possui permissão para alterar o Catálogo Digital.',
      })
    ).toEqual({
      title: 'Permissão insuficiente',
      message: 'Seu perfil não possui permissão para alterar o Catálogo Digital.',
    });
  });
});
