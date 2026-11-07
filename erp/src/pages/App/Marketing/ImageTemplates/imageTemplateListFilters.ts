import { z } from 'zod';
import { getSaoPauloDayInfo } from '../../../../../../shared-utils/commercialScheduling/timezoneUtils';
import { buildNormalizedWordsRegex } from '../../../../../../shared-utils/searchText';

const optionalDay = z.union([z.literal(''), z.iso.date()]);
export const templateLibraryFilterSchema = z.object({
  search: z.string().trim().max(160, 'Pesquise com até 160 caracteres.'),
  period: z.enum(['all', 'today', 'last7', 'last30', 'custom']),
  from: optionalDay,
  through: optionalDay,
}).refine(({ period, from, through }) => period !== 'custom' || !from || !through || from <= through, {
  path: ['through'], message: 'A data final deve ser igual ou posterior à inicial.',
});

export type TemplateLibraryFilters = z.infer<typeof templateLibraryFilterSchema>;
export type TemplateListColumn = 'name' | 'description' | 'created_at';
export type TemplateListOrder = { column: TemplateListColumn; ascending: boolean };
export type TemplateListQuery = TemplateListOrder & { pattern: string; from: string; through: string };

export const EMPTY_TEMPLATE_FILTERS: TemplateLibraryFilters = { search: '', period: 'all', from: '', through: '' };
export const DEFAULT_TEMPLATE_ORDER: TemplateListOrder = { column: 'created_at', ascending: false };

export function templateListQuery(filters: TemplateLibraryFilters, order: TemplateListOrder, now = new Date()): TemplateListQuery {
  const pattern = buildNormalizedWordsRegex(filters.search);
  if (filters.period === 'all') return { ...order, pattern, from: '', through: '' };
  if (filters.period === 'custom') return { ...order, pattern, from: filters.from, through: filters.through };
  const daysBack = { today: 0, last7: 6, last30: 29 }[filters.period];
  return { ...order, pattern, from: getSaoPauloDayInfo(-daysBack, now).isoDate, through: getSaoPauloDayInfo(0, now).isoDate };
}
