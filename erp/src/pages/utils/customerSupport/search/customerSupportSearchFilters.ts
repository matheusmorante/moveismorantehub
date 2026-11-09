import type { CustomerSupportHistoryCursor, CustomerSupportHistoryPage } from '../customerSupportHistoryTypes';
import { mapRowToMessage } from '../customerSupportMappers';
import { buildPostgrestAccentInsensitiveWordsPattern } from '../../../../../../shared-utils/searchText';

export function applyTimestampCursor(query: any, before: { timestamp: string; id: string }) {
  const timestamp = JSON.stringify(before.timestamp);
  const filter = 'timestamp.lt.' + timestamp + ',and(timestamp.eq.' + timestamp + ',id.lt.' + before.id + ')';
  return query.or(filter);
}

export function applyHistoryCursor(query: any, cursor: CustomerSupportHistoryCursor | null) {
  return cursor ? applyTimestampCursor(query, cursor) : query;
}

export function toHistoryPage(rows: any[], pageSize: number): CustomerSupportHistoryPage {
  const hasMore = rows.length > pageSize;
  const messages = rows.slice(0, pageSize).map(mapRowToMessage);
  const last = messages[messages.length - 1];
  return {
    messages,
    hasMore,
    nextCursor: last ? { timestamp: last.timestamp, id: last.id } : null,
  };
}

export function literalSupportSearchPattern(search: string): string {
  return buildPostgrestAccentInsensitiveWordsPattern(search);
}

export function supportSearchOrFilters(filters: Array<{ column: string; pattern: string }>) {
  return filters.map(({ column, pattern }) => column + '.imatch.' + pattern).join(',');
}

export function withSupportSearchAbort(query: any, signal?: AbortSignal) {
  return signal && typeof query?.abortSignal === 'function' ? query.abortSignal(signal) : query;
}

export function applyColumnTimestampCursor(
  query: any,
  column: string,
  cursor: CustomerSupportHistoryCursor | null
) {
  if (!cursor) return query;
  const timestamp = JSON.stringify(cursor.timestamp);
  return query.or(
    column + '.lt.' + timestamp + ',and(' + column + '.eq.' + timestamp + ',id.lt.' + cursor.id + ')'
  );
}

export function getGlobalSearchLimit(pageSize: number) {
  return Math.max(1, Math.min(5, Math.trunc(pageSize) || 5));
}
