/** Interpreta datas comerciais do pedido sem mudar o dia local armazenado. */
export function parseDashboardOrderDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const dateString = value.trim();

  const isoDateOnly = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDateOnly) {
    const [, year, month, day] = isoDateOnly.map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? date
      : null;
  }

  const ptBrDate = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:, (\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (ptBrDate) {
    const [, rawDay, rawMonth, rawYear, rawHour = '0', rawMinute = '0', rawSecond = '0'] = ptBrDate;
    const year = Number(rawYear);
    const month = Number(rawMonth) - 1;
    const day = Number(rawDay);
    const hour = Number(rawHour);
    const minute = Number(rawMinute);
    const second = Number(rawSecond);
    const date = new Date(year, month, day, hour, minute, second);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
      && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second
      ? date
      : null;
  }

  const naiveTimestamp = dateString.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (naiveTimestamp) {
    const [, datePart, hourPart, minutePart, secondPart = '0'] = naiveTimestamp;
    const calendarDate = parseDashboardOrderDate(datePart);
    if (!calendarDate) return null;
    const date = new Date(
      calendarDate.getFullYear(), calendarDate.getMonth(), calendarDate.getDate(),
      Number(hourPart), Number(minutePart), Number(secondPart),
    );
    return date.getHours() === Number(hourPart) && date.getMinutes() === Number(minutePart)
      && date.getSeconds() === Number(secondPart)
      ? date
      : null;
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(dateString)) return null;
  const datePart = dateString.slice(0, 10);
  if (!parseDashboardOrderDate(datePart)) return null;
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
