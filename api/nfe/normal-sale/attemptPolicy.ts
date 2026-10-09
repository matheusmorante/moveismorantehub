import type { FiscalEmissionCommand } from '../fiscalSnapshot';

/** Consent can be renewed; every fiscal choice remains part of the immutable command. */
export function fiscalAttemptCommand(command: FiscalEmissionCommand): Record<string, unknown> {
  const {
    productionConfirmed: _consent,
    previewOnly: _previewOnly,
    previewProof: _previewProof,
    ...fiscalCommand
  } = command;
  return JSON.parse(JSON.stringify(fiscalCommand));
}

export function canonicalFiscalCommand(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalFiscalCommand).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalFiscalCommand(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

export function saoPauloEmissionTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error('Data fiscal inválida.');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  );
  const offset = parts.timeZoneName.replace('GMT', '') || '+00:00';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`;
}

/** A 100/204 or an incomplete batch never proves rejection of the reserved invoice. */
export function isUncertainAuthorization(cStat: string, pending: boolean): boolean {
  return (
    pending ||
    !/^\d{3}$/.test(cStat) ||
    ['100', '103', '104', '105', '108', '109', '204', '539', '999'].includes(cStat)
  );
}
