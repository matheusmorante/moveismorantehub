import type Person from '../../../types/person.type';

export const PERSON_QUERY_COLUMNS =
  'id, person_type, person_type_pf_pj, full_name, social_name, nickname, cpf_cnpj, rg_ie, ie_indicator, email, phone, address, observation, active, is_draft, deleted, deleted_at, position, lead_time, marketing_origin, stock_origins, created_at, updated_at';

// Campos suficientes para identificar, filtrar e exibir os responsáveis do inventário.
// A consulta genérica continua usando PERSON_QUERY_COLUMNS para os demais consumidores.
export const INVENTORY_AUDIT_EMPLOYEE_QUERY_COLUMNS =
  'id, person_type, full_name, social_name, nickname, email, phone, address, deleted, position, updated_at';

export const PEOPLE_FETCH_PAGE_SIZE = 1000;
export const PERSON_PREFETCH_MAX_AGE_MS = 30_000;
export const PEOPLE_CACHE_TTL_MS = 300_000; // 5 minutos

export interface PersonCacheEntry {
  data: Person[];
  timestamp: number;
  promise?: Promise<Person[]>;
}

export interface FetchPersonsOptions {
  throwOnError?: boolean;
  syncEmployeeProfiles?: boolean;
}
