import { describe, expect, it } from 'vitest';
import {
  filterInventoryResponsibleCandidates,
  findDefaultInventoryResponsibleId,
  getInventoryResponsibleDisplayName,
} from '../../../../../../shared-utils/inventoryResponsible';
import { mobileInventoryAuditScopeSchema } from '../../../../../../shared-utils/inventoryAuditFormSchemas';

describe('responsável elegível do inventário', () => {
  const employees = [
    { id: 'employee-1', type: 'employees', fullName: 'Ana', role: 'stockist' },
    {
      id: 'employee-2',
      type: 'employees',
      full_name: 'Bruno',
      role: 'pending',
      position: 'Sem Acesso',
    },
    {
      id: 'employee-3',
      type: 'employees',
      full_name: 'Carla',
      role: 'pending',
      position: 'Gerente',
    },
    { id: 'supplier-1', type: 'suppliers', fullName: 'Fornecedor', position: 'Vendedor' },
    { id: 'employee-4', person_type: 'employees', social_name: 'Dani', roles: ['seller'] },
    { id: 'employee-5', person_type: 'employees', fullName: 'Ex-colaborador', deleted: true },
  ];

  it('exige perfil de acesso concedido e ignora registros excluídos', () => {
    expect(filterInventoryResponsibleCandidates(employees).map(({ id }) => id)).toEqual([
      'employee-1',
      'employee-4',
    ]);
  });

  it('usa somente uma correspondência elegível pelo mesmo ID do perfil', () => {
    expect(findDefaultInventoryResponsibleId(employees, 'employee-1')).toBe('employee-1');
    expect(findDefaultInventoryResponsibleId(employees, 'employee-2')).toBe('');
    expect(findDefaultInventoryResponsibleId(employees, 'auth-profile-1')).toBe('');
  });

  it('prioriza nome completo, nome social e apelido para exibir o responsável', () => {
    expect(getInventoryResponsibleDisplayName(employees[0])).toBe('Ana');
    expect(getInventoryResponsibleDisplayName(employees[4])).toBe('Dani');
    expect(getInventoryResponsibleDisplayName({ nickname: 'Dani' })).toBe('Dani');
  });

  it('exige nome do responsável na configuração mobile antes de chamar o serviço', () => {
    const base = {
      type: 'full' as const,
      name: 'Inventário geral',
      supplierId: '',
      responsibleId: 'employee-1',
      itemsSnapshot: [],
    };
    expect(mobileInventoryAuditScopeSchema.safeParse({ ...base, responsibleName: 'Ana' }).success).toBe(
      true
    );
    expect(mobileInventoryAuditScopeSchema.safeParse(base).success).toBe(false);
  });
});
