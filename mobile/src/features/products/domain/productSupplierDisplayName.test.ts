import { describe, expect, it } from 'vitest';
import {
  getProductSupplierDisplayName,
  matchesProductSupplierSearch,
} from '../../../../../shared-utils/productSupplierDisplayName';

describe('identificação de fornecedor no cadastro de produto', () => {
  it('usa a precedência de nome do ERP para exibição e busca', () => {
    const supplier = {
      fullName: 'Nome completo',
      socialName: 'Nome social',
      nickname: 'Apelido',
      tradeName: 'Fantasia',
    };

    expect(getProductSupplierDisplayName(supplier)).toBe('Nome completo');
    expect(matchesProductSupplierSearch(supplier, ' NOME COMPLETO ')).toBe(true);
    expect(matchesProductSupplierSearch(supplier, 'Apelido')).toBe(false);
  });

  it('usa social_name antes de nickname quando full_name está vazio', () => {
    const supplier = { full_name: '', social_name: 'Razão alternativa', nickname: 'Apelido' };

    expect(getProductSupplierDisplayName(supplier)).toBe('Razão alternativa');
    expect(matchesProductSupplierSearch(supplier, 'razão alternativa')).toBe(true);
  });

  it('aceita nickname legado quando não há nome ou social_name', () => {
    expect(getProductSupplierDisplayName({ full_name: '', nickname: 'Fantasia' })).toBe('Fantasia');
  });
});
