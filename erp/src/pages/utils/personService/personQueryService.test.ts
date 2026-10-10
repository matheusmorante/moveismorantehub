import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  mapFromDB: vi.fn((person) => person),
  syncMissingEmployeesFromProfiles: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('./personMapper', () => ({ TABLE_NAME: 'people', mapFromDB: mocks.mapFromDB }));
vi.mock('./personSyncService', () => ({
  syncMissingEmployeesFromProfiles: mocks.syncMissingEmployeesFromProfiles,
}));

import { fetchPersons, PERSON_QUERY_COLUMNS, subscribeToPeople } from './personQueryService';

afterEach(() => {
  vi.clearAllMocks();
});

describe('person query projection', () => {
  it('uses only columns present in the people schema when loading a list', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      or: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn().mockResolvedValue({ data: [{ id: 'person-1' }], error: null }),
    };
    mocks.from.mockReturnValue(chain);

    await expect(fetchPersons('customers', false, { throwOnError: true })).resolves.toEqual([
      { id: 'person-1' },
    ]);

    expect(mocks.from).toHaveBeenCalledWith('people');
    expect(chain.select).toHaveBeenCalledWith(PERSON_QUERY_COLUMNS);
    expect(chain.range).toHaveBeenCalledWith(0, 999);
    expect(PERSON_QUERY_COLUMNS).not.toContain('employee_code');
  });

  it('loads the next page when the first page reaches the API row cap', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `person-${String(index).padStart(4, '0')}`,
      full_name: `Pessoa ${String(index).padStart(4, '0')}`,
    }));
    const responses = [
      { data: firstPage, error: null },
      { data: [{ id: 'person-after-api-cap', full_name: 'Pessoa depois do limite' }], error: null },
    ];
    const chains: any[] = [];
    mocks.from.mockImplementation(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        or: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        range: vi.fn().mockImplementation(async () => responses.shift()),
      };
      chains.push(chain);
      return chain;
    });

    const people = await fetchPersons('customers', false, { throwOnError: true });

    expect(people).toHaveLength(1001);
    expect(people.at(-1)?.id).toBe('person-after-api-cap');
    expect(chains.map((chain) => chain.range.mock.calls[0])).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('does not run employee profile synchronization from a read-only list query', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      or: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn().mockResolvedValue({ data: [{ id: 'employee-1' }], error: null }),
    };
    mocks.from.mockReturnValue(chain);

    await expect(
      fetchPersons('employees', false, {
        throwOnError: true,
        syncEmployeeProfiles: false,
      })
    ).resolves.toEqual([{ id: 'employee-1' }]);

    expect(mocks.syncMissingEmployeesFromProfiles).not.toHaveBeenCalled();
  });

  it('does not cache a failed subscription query and allows a later retry', async () => {
    const responses = [
      { data: null, error: new Error('page query failed') },
      { data: [{ id: 'person-retried' }], error: null },
    ];
    mocks.from.mockImplementation(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        or: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        order: vi.fn(() => chain),
        range: vi.fn().mockImplementation(async () => responses.shift()),
      };
      return chain;
    });

    const firstResult = new Promise<any[]>((resolve) => subscribeToPeople('customers', resolve));
    await expect(firstResult).resolves.toEqual([]);

    const retryResult = new Promise<any[]>((resolve) => subscribeToPeople('customers', resolve));
    await expect(retryResult).resolves.toEqual([{ id: 'person-retried' }]);
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });
});
