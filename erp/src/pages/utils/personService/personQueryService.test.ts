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

import {
  fetchPersonById,
  fetchPersons,
  PERSON_QUERY_COLUMNS,
  preloadPersonById,
  searchPeople,
  getRecentPeople,
  subscribeToPeople,
} from './personQueryService';

afterEach(() => {
  vi.clearAllMocks();
});

describe('person query projection', () => {
  it.each(['search', 'recent'] as const)('selects only canonical customers from the requested test run before pagination (%s)', async (kind) => {
    const identity = { runId: '702b921e-fd31-488d-925e-560602a65510', ownerId: 'eccde09e-72d8-4efe-a387-eb34114dea39' };
    const person = (id: string, metadata?: object) => ({ id, fullAddress: { testArtifact: metadata } });
    const own = person('owned', { is_test: true, ...identity });
    const chain: any = {
      select: vi.fn(() => chain), or: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain),
      limit: vi.fn().mockResolvedValue({ data: [
        own, person('operational'),
        person('other-run', { is_test: true, ...identity, runId: '18f29e44-f7f1-4caa-b640-5fdffbc0047a' }),
        person('other-owner', { is_test: true, ...identity, ownerId: '11111111-1111-4111-8111-111111111111' }),
        person('invalid-marker', { is_test: 'true', ...identity }),
      ], error: null }),
    };
    mocks.from.mockReturnValue(chain);
    const result = kind === 'search'
      ? await searchPeople('Cliente', 'customers', 20, identity)
      : await getRecentPeople('customers', 20, identity);
    expect(result).toEqual([own]);
    expect(chain.eq).toHaveBeenCalledWith('full_address->testArtifact->>is_test', 'true');
    expect(chain.eq).toHaveBeenCalledWith('full_address->testArtifact->>runId', identity.runId);
    expect(chain.eq).toHaveBeenCalledWith('full_address->testArtifact->>ownerId', identity.ownerId);
  });

  it.each(['search', 'recent'] as const)('keeps test customers hidden in an ordinary query (%s)', async (kind) => {
    const normal = { id: 'operational' };
    const chain: any = {
      select: vi.fn(() => chain), or: vi.fn(() => chain), eq: vi.fn(() => chain), order: vi.fn(() => chain),
      limit: vi.fn().mockResolvedValue({ data: [normal, { id: 'test', fullAddress: { testArtifact: { is_test: true } } }], error: null }),
    };
    mocks.from.mockReturnValue(chain);
    expect(kind === 'search' ? await searchPeople('Cliente', 'customers') : await getRecentPeople('customers')).toEqual([normal]);
    expect(chain.eq).not.toHaveBeenCalled();
  });

  it('reuses an in-flight customer read by ID', async () => {
    let resolvePerson: ((value: { data: { id: string }; error: null }) => void) | undefined;
    const queryResult = new Promise<{ data: { id: string }; error: null }>((resolve) => {
      resolvePerson = resolve;
    });
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(() => queryResult),
    };
    mocks.from.mockReturnValue(chain);

    const first = fetchPersonById('customer-1');
    const second = fetchPersonById('customer-1');
    expect(mocks.from).toHaveBeenCalledTimes(1);

    resolvePerson?.({ data: { id: 'customer-1' }, error: null });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: 'customer-1' },
      { id: 'customer-1' },
    ]);
  });

  it('reuses a recently preloaded customer read when the emission modal opens', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'customer-prefetch' }, error: null }),
    };
    mocks.from.mockReturnValue(chain);

    await preloadPersonById('customer-prefetch');
    const customer = await fetchPersonById('customer-prefetch');

    expect(customer).toEqual({ id: 'customer-prefetch' });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

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
