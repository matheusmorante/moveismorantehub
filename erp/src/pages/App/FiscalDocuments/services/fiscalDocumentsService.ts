/**
 * Fiscal Documents Service Facade
 *
 * Centralizes the public API for querying, listing, and inspecting fiscal documents.
 * Implementation details are decomposed into specialized subservices under `./fiscalDocuments/`:
 * - `fiscalDocumentsListService`: PostgREST listing, dynamic filters, orders linking, cancellation eligibility.
 * - `fiscalDocumentDetailsService`: HTTP API invocation (`/api/nfe/document-details`) with timeout & schema validation.
 * - `fiscalDocumentFallbackService`: Resilient direct Supabase contingency fallback queries.
 * - `fiscalDocumentParsers`: Type guards, normalization helpers, and entity mapping functions.
 */

export {
  fetchFiscalDocumentsList,
  type FetchFiscalDocumentsParams,
  type FetchFiscalDocumentsResult,
} from './fiscalDocuments/fiscalDocumentsListService';

export { fetchFiscalDocumentDetails } from './fiscalDocuments/fiscalDocumentDetailsService';

export { fetchFiscalDocumentDetailsFromSupabase } from './fiscalDocuments/fiscalDocumentFallbackService';

export {
  isRecord,
  nullableString,
  parseFiscalDocumentEvent,
  mapNfeDocumentRecord,
  mapFiscalDocumentDetailsRecord,
  mapOperationDraftSummary,
  parseOrderFiscalSituation,
} from './fiscalDocuments/fiscalDocumentParsers';
