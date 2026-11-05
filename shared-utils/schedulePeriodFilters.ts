const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function schedulePeriodFilters(period: string, reference = new Date(), custom?: { start: string; end: string }) {
  const start = new Date(reference); const end = new Date(reference);
  if (period === 'custom') return { startDate: custom?.start || '', endDate: custom?.end || '' };
  if (period === 'default') { start.setDate(start.getDate() - 1); return { startDate: dateKey(start) }; }
  if (period === 'today_and_following') return { startDate: dateKey(start) };
  if (period === 'today') return { startDate: dateKey(start), endDate: dateKey(start) };
  if (period === 'week') { start.setDate(start.getDate() - start.getDay()); end.setTime(start.getTime()); end.setDate(start.getDate() + 6); }
  else if (period === 'month') { start.setDate(1); end.setMonth(end.getMonth() + 1, 0); }
  else if (period === 'year') { start.setMonth(0, 1); end.setMonth(11, 31); }
  else return {};
  return { startDate: dateKey(start), endDate: dateKey(end) };
}
