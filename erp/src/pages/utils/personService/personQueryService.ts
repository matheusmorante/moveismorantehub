import { supabase } from '@/pages/utils/supabaseConfig';
import type Person from '../../types/person.type';
import { TABLE_NAME, mapFromDB } from './personMapper';
import { syncMissingEmployeesFromProfiles } from './personSyncService';
import type { TestArtifactIdentity } from '../../../../../shared-utils/testing/testArtifactPolicy';
import { isTestOperatorVisibleToUser } from '../../../../../shared-utils/testing/testOperatorVisibility';
import {
  buildNormalizedWordsRegex,
  buildPostgrestAccentInsensitiveOrFilter,
  matchesSearchText,
} from '../../../../../shared-utils/core/searchText';
import {
  filterInventoryResponsibleCandidates,
  getInventoryResponsibleDisplayName,
} from '../../../../../shared-utils/inventoryResponsible';
import {
  INVENTORY_AUDIT_EMPLOYEE_QUERY_COLUMNS,
  INBOUND_INVOICE_MAPPING_SUPPLIER_QUERY_COLUMNS,
  PEOPLE_FETCH_PAGE_SIZE,
  PERSON_QUERY_COLUMNS,
  type FetchPersonsOptions,
  isTestPerson,
  matchesPersonQueryContext,
  mapAndSortPeople,
  fetchAllPeopleRows,
  getCurrentUserEmail,
  getPreloadedPerson,
  setPreloadedPerson,
  personByIdRequests,
} from './query';
import { subscribeToPeople } from './query/personSubscriptionService';

export { INBOUND_INVOICE_MAPPING_SUPPLIER_QUERY_COLUMNS, PERSON_QUERY_COLUMNS, isTestPerson, subscribeToPeople };

export const fetchPersons = async (
  collectionName: string = 'suppliers',
  includeDeleted = false,
  options: FetchPersonsOptions = {}
): Promise<Person[]> => {
  try {
    if (collectionName === 'employees' && options.syncEmployeeProfiles !== false) {
      await syncMissingEmployeesFromProfiles();
    }

    const rows = await fetchAllPeopleRows(
      collectionName,
      includeDeleted,
      options.columns ?? PERSON_QUERY_COLUMNS
    );
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    return mapAndSortPeople(collectionName, rows, includeDeleted, currentUserEmail);
  } catch (e) {
    console.error('Erro ao buscar pessoas em personService:', e);
    if (options.throwOnError) throw e;
    return [];
  }
};

export type EmployeeDirectorySortBy = 'fullName' | 'createdAt';

export interface EmployeeDirectoryPage {
  people: Person[];
  totalItems: number;
}

/** Uses a server page only for the administrative employees directory. */
export const fetchEmployeeDirectoryPage = async ({
  page,
  pageSize,
  sortBy,
  sortOrder,
}: {
  page: number;
  pageSize: number;
  sortBy: EmployeeDirectorySortBy;
  sortOrder: 'asc' | 'desc';
}): Promise<EmployeeDirectoryPage> => {
  const { data, error } = await supabase.rpc('list_admin_employee_page', {
    p_page: page,
    p_page_size: pageSize,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
  });

  if (error) throw error;

  const response = Array.isArray(data) ? data[0] : null;
  const rows = response?.rows;
  const totalItems = Number(response?.total_count);

  if (!Array.isArray(rows) || !Number.isSafeInteger(totalItems) || totalItems < 0) {
    throw new Error('A consulta paginada de colaboradores retornou um resultado inválido.');
  }

  return { people: rows.map(mapFromDB), totalItems };
};

/** Loads only the employee fields used by the ERP inventory-responsible selector. */
export const fetchInventoryAuditEmployees = async (): Promise<Person[]> => {
  try {
    await syncMissingEmployeesFromProfiles();

    const rows = await fetchAllPeopleRows(
      'employees',
      false,
      INVENTORY_AUDIT_EMPLOYEE_QUERY_COLUMNS
    );
    const currentUserEmail = await getCurrentUserEmail();
    return mapAndSortPeople('employees', rows, false, currentUserEmail);
  } catch (e) {
    console.error('Erro ao buscar responsáveis do inventário em personService:', e);
    return [];
  }
};

const mapInventoryAuditCandidates = (rows: any[], currentUserEmail: string): Person[] =>
  filterInventoryResponsibleCandidates(
    rows
      .map(mapFromDB)
      .filter((person) => !isTestPerson(person))
      .filter((person) => isTestOperatorVisibleToUser(person, currentUserEmail))
  );

/** Searches matching names on the server, then applies legacy role aliases and deduplication before showing five. */
export const searchInventoryAuditEmployees = async (
  search: string,
  signal?: AbortSignal
): Promise<Person[]> => {
  const queryText = search.trim();
  if (queryText.replace(/\s+/g, '').length < 3) return [];

  const searchFilter = buildPostgrestAccentInsensitiveOrFilter(
    ['full_name', 'social_name', 'nickname'],
    queryText
  );
  if (!searchFilter) return [];

  const rows: any[] = [];
  for (let firstRow = 0; ; firstRow += PEOPLE_FETCH_PAGE_SIZE) {
    if (signal?.aborted) return [];

    let pageQuery = supabase
      .from(TABLE_NAME)
      .select(INVENTORY_AUDIT_EMPLOYEE_QUERY_COLUMNS)
      .or('deleted.eq.false,deleted.is.null')
      .or('person_type.ilike.employees,and(position.not.is.null,position.neq."")')
      .or(searchFilter)
      .order('full_name', { ascending: true })
      .order('id', { ascending: true })
      .range(firstRow, firstRow + PEOPLE_FETCH_PAGE_SIZE - 1);
    if (signal) pageQuery = pageQuery.abortSignal(signal);

    const { data, error } = await pageQuery;

    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < PEOPLE_FETCH_PAGE_SIZE) break;
  }

  if (signal?.aborted) return [];
  const candidates = mapInventoryAuditCandidates(rows, await getCurrentUserEmail());
  return candidates
    .filter((employee) => matchesSearchText(getInventoryResponsibleDisplayName(employee), queryText))
    .sort((left, right) => (left.fullName || '').localeCompare(right.fullName || ''))
    .slice(0, 5);
};

export const fetchPersonById = (id: string): Promise<Person | null> => {
  if (!id) return Promise.resolve(null);

  const preloaded = getPreloadedPerson(id);
  if (preloaded) {
    return Promise.resolve(preloaded);
  }

  const existingRequest = personByIdRequests.get(id);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select(PERSON_QUERY_COLUMNS)
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;
      return mapFromDB(data);
    } catch (e) {
      console.error('Erro ao buscar pessoa por ID em personService:', e);
      return null;
    }
  })();

  personByIdRequests.set(id, request);

  void request.finally(() => {
    if (personByIdRequests.get(id) === request) personByIdRequests.delete(id);
  });

  return request;
};

/** Eagerly resolve a person while the user is reviewing the order's available actions. */
export const preloadPersonById = async (id: string): Promise<Person | null> => {
  const person = await fetchPersonById(id);
  if (id && person) {
    setPreloadedPerson(id, person);
  }
  return person;
};

interface FilteredPeopleQueryParams {
  collectionName: string;
  limit: number;
  testContext?: TestArtifactIdentity;
  searchQuery?: string;
  errorLabel: string;
}

const fetchFilteredPeople = async ({
  collectionName,
  limit,
  testContext,
  searchQuery,
  errorLabel,
}: FilteredPeopleQueryParams): Promise<Person[]> => {
  if (testContext && collectionName !== 'customers') return [];

  let peopleQuery = supabase
    .from(TABLE_NAME)
    .select(PERSON_QUERY_COLUMNS)
    .or('deleted.eq.false,deleted.is.null');

  if (collectionName === 'employees') {
    peopleQuery = peopleQuery.or(
      `person_type.ilike.${collectionName},and(position.not.is.null,position.neq."")`
    );
  } else if (collectionName === 'customers') {
    peopleQuery = peopleQuery.or('person_type.ilike.customers,person_type.ilike.customer');
  } else {
    peopleQuery = peopleQuery.or('person_type.ilike.suppliers,person_type.ilike.supplier');
  }

  if (searchQuery) {
    peopleQuery = peopleQuery.filter(
      'search_people_main_text',
      'imatch',
      buildNormalizedWordsRegex(searchQuery)
    );
  }

  if (testContext) {
    peopleQuery = peopleQuery
      .eq('full_address->testArtifact->>is_test', 'true')
      .eq('full_address->testArtifact->>runId', testContext.runId)
      .eq('full_address->testArtifact->>ownerId', testContext.ownerId);
  }

  try {
    const currentUserEmail = collectionName === 'employees' ? await getCurrentUserEmail() : '';
    const { data, error } = await peopleQuery
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data
      .map(mapFromDB)
      .filter((person) => matchesPersonQueryContext(person, testContext))
      .filter(
        (person) =>
          collectionName !== 'employees' ||
          isTestOperatorVisibleToUser(person, currentUserEmail)
      );
  } catch (e) {
    console.error(`Erro ao buscar ${errorLabel}:`, e);
    return [];
  }
};

export const searchPeople = async (
  query: string,
  collectionName: string,
  limit = 30,
  testContext?: TestArtifactIdentity
): Promise<Person[]> => {
  if (!query || query.trim().length < 2) return [];
  return fetchFilteredPeople({
    collectionName,
    limit,
    testContext,
    searchQuery: query,
    errorLabel: 'pessoas no searchPeople',
  });
};

export const getRecentPeople = async (
  collectionName: string,
  limit = 20,
  testContext?: TestArtifactIdentity
): Promise<Person[]> =>
  fetchFilteredPeople({
    collectionName,
    limit,
    testContext,
    errorLabel: 'pessoas recentes',
  });
