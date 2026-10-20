import { describe, expect, it } from 'vitest';
import {
  isTestPerson,
  mapAndSortPeople,
  matchesPersonQueryContext,
} from '../index';

describe('personDeduplication', () => {
  it('identifies test persons correctly', () => {
    expect(isTestPerson({ fullName: 'Cliente Normal' })).toBe(false);
    expect(isTestPerson({ fullName: '[HML NF TEST] João' })).toBe(true);
    expect(isTestPerson({ fullName: 'TEST_AUT_Usuario' })).toBe(true);
    expect(isTestPerson({ id: 'TEST_AUT_123' })).toBe(true);
  });

  it('deduplicates employees preferring the record with more contact information', () => {
    const rawEmployees = [
      {
        id: 'emp-1',
        full_name: 'Carlos Silva',
        email: 'carlos@loja.com',
        phone: '',
        address: null,
      },
      {
        id: 'emp-2',
        full_name: 'Carlos Silva',
        email: 'carlos@loja.com',
        phone: '44999999999',
        address: { street: 'Rua Paraná, 100' },
      },
    ];

    const mapped = mapAndSortPeople('employees', rawEmployees);
    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('emp-2');
    expect(mapped[0].phone).toBe('44999999999');
  });

  it('filters out test persons when includeDeleted is false', () => {
    const rawPeople = [
      { id: '1', full_name: 'Normal Person' },
      { id: '2', full_name: '[HML NF TEST] Fake Person' },
    ];

    const result = mapAndSortPeople('customers', rawPeople, false);
    expect(result).toHaveLength(1);
    expect(result[0].fullName).toBe('Normal Person');
  });
});
