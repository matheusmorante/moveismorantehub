import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), mapFromDB: vi.fn((person) => person) }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('./personMapper', () => ({ TABLE_NAME: 'people', mapFromDB: mocks.mapFromDB }));
vi.mock('./personSyncService', () => ({ syncMissingEmployeesFromProfiles: vi.fn() }));

import { fetchPersons, PERSON_QUERY_COLUMNS } from './personQueryService';

afterEach(() => {
  vi.clearAllMocks();
});

describe('person query projection', () => {
  it('uses only columns present in the people schema when loading a list', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'person-1' }], error: null });
    const chain: any = {
      select: vi.fn(() => chain),
      or: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order,
    };
    mocks.from.mockReturnValue(chain);

    await expect(fetchPersons('customers', false, { throwOnError: true })).resolves.toEqual([
      { id: 'person-1' },
    ]);

    expect(mocks.from).toHaveBeenCalledWith('people');
    expect(chain.select).toHaveBeenCalledWith(PERSON_QUERY_COLUMNS);
    expect(PERSON_QUERY_COLUMNS).not.toContain('employee_code');
  });
});
