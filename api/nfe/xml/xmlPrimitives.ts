import type { FiscalAddress } from '../fiscalSnapshot';

const escapeXml = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char] || char
  );
export const tag = (name: string, value: string | number) =>
  `<${name}>${escapeXml(value)}</${name}>`;
export const money = (value: number) => value.toFixed(2);
export const decimal = (value: number, scale: number) => value.toFixed(scale);
export const dateOnly = (value: string, field: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} inválida.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error(`${field} inválida.`);
  return value;
};
export function percent(value: number): string {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100 ||
    Math.abs(value * 10000 - Math.round(value * 10000)) > 0.000001
  )
    throw new Error('Alíquota fiscal inválida.');
  return value.toFixed(4);
}

export function accessKeyDigit(base43: string): number {
  let sum = 0;
  for (let index = 42; index >= 0; index--) sum += Number(base43[index]) * (2 + ((42 - index) % 8));
  const digit = 11 - (sum % 11);
  return digit >= 10 ? 0 : digit;
}

export function requireCode(value: string, pattern: RegExp, field: string): string {
  if (!pattern.test(value)) throw new Error(`${field} inválido para serialização fiscal.`);
  return value;
}

export function addressXml(address: FiscalAddress, name: 'enderEmit' | 'enderDest'): string {
  requireCode(address.municipalityCode, /^\d{7}$/, 'Município IBGE');
  requireCode(address.uf, /^[A-Z]{2}$/, 'UF');
  if (address.postalCode) requireCode(address.postalCode, /^\d{8}$/, 'CEP');
  for (const [field, value] of Object.entries(address).filter(
    ([field]) => field !== 'postalCode'
  )) {
    if (!value?.trim()) throw new Error(`Endereço fiscal sem ${field}.`);
  }
  return (
    `<${name}>${tag('xLgr', address.street)}${tag('nro', address.number)}` +
    `${tag('xBairro', address.district)}${tag('cMun', address.municipalityCode)}` +
    `${tag('xMun', address.municipality)}${tag('UF', address.uf)}` +
    `${address.postalCode ? tag('CEP', address.postalCode) : ''}${tag('cPais', '1058')}${tag('xPais', 'BRASIL')}</${name}>`
  );
}
