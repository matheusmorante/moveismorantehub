import { ZERO_OWN_ICMS_CSOSNS, zeroOwnIcmsGroup } from '../../../shared-utils/fiscalIcmsGroups';
import type { DeterminedTaxGroup } from '../fiscalSnapshot';
import { money, percent, requireCode, tag } from './xmlPrimitives';

function taxAmount(tax: DeterminedTaxGroup, field: string): number {
  const value = tax.values[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${tax.group}.${field} precisa de valor numérico decidido.`);
  return value;
}

export function serializeFiscalTaxes(
  taxes: ReadonlyArray<DeterminedTaxGroup>,
  origin: string
): string {
  const icms = taxes.find((tax) => tax.group === 'ICMS');
  const pis = taxes.find((tax) => tax.group === 'PIS');
  const cofins = taxes.find((tax) => tax.group === 'COFINS');
  if (!icms || !pis || !cofins || taxes.some((tax) => tax.group === 'IPI'))
    throw new Error('Grupos tributários ausentes ou ainda não suportados pelo serializer.');
  // An approved classification must not silently drop ST/FCP/credit values while
  // serializing one of the small set of ICMS groups currently implemented.
  const supportedIcmsFields =
    icms.codeSystem === 'CST' && icms.code === '00'
      ? ['modBC', 'vBC', 'pICMS', 'vICMS']
      : ['vICMS'];
  if (Object.keys(icms.values).some((field) => !supportedIcmsFields.includes(field)))
    throw new Error(
      'INTERSTATE_TAX_TREATMENT_NOT_IMPLEMENTED: campos ICMS/ST/FCP/crédito sem serialização suportada.'
    );
  let icmsGroup: string;
  if (icms.codeSystem === 'CSOSN' && ZERO_OWN_ICMS_CSOSNS.includes(icms.code)) {
    if (taxAmount(icms, 'vICMS') !== 0) throw new Error('ICMSSN102 não destaca ICMS próprio.');
    const group = zeroOwnIcmsGroup(icms.code);
    icmsGroup = `<${group}>${tag('orig', origin)}${tag('CSOSN', icms.code)}</${group}>`;
  } else if (icms.codeSystem === 'CST' && icms.code === '00') {
    const base = taxAmount(icms, 'vBC');
    const rate = taxAmount(icms, 'pICMS');
    const amount = taxAmount(icms, 'vICMS');
    if (Math.abs(Math.round(base * rate) - Math.round(amount * 100)) > 1)
      throw new Error('ICMS do item não reconcilia com base e alíquota.');
    icmsGroup =
      `<ICMS00>${tag('orig', origin)}${tag('CST', icms.code)}` +
      `${tag('modBC', requireCode(String(icms.values.modBC), /^[0-3]$/, 'Modalidade da base ICMS'))}` +
      `${tag('vBC', money(base))}${tag('pICMS', percent(rate))}` +
      `${tag('vICMS', money(amount))}</ICMS00>`;
  } else throw new Error(`Grupo ICMS ${icms.codeSystem}/${icms.code} ainda não suportado.`);

  const contribution = (tax: DeterminedTaxGroup, group: 'PIS' | 'COFINS') => {
    if (tax.codeSystem !== 'CST') throw new Error(`${group} exige CST explícito.`);
    const rateName = group === 'PIS' ? 'pPIS' : 'pCOFINS';
    const valueName = group === 'PIS' ? 'vPIS' : 'vCOFINS';
    const amount = taxAmount(tax, valueName);
    if (['04', '05', '06', '07', '08', '09'].includes(tax.code)) {
      if (amount !== 0) throw new Error(`${group} não tributado com valor diferente de zero.`);
      return `<${group}><${group}NT>${tag('CST', tax.code)}</${group}NT></${group}>`;
    }
    if (!['01', '02', '49', '99'].includes(tax.code))
      throw new Error(`${group} CST ${tax.code} ainda não suportado.`);
    const base = taxAmount(tax, 'vBC');
    const rate = taxAmount(tax, rateName);
    if (Math.abs(Math.round(base * rate) - Math.round(amount * 100)) > 1)
      throw new Error(`${group} do item não reconcilia com base e alíquota.`);
    const variant = ['01', '02'].includes(tax.code) ? `${group}Aliq` : `${group}Outr`;
    return (
      `<${group}><${variant}>${tag('CST', tax.code)}${tag('vBC', money(base))}` +
      `${tag(rateName, percent(rate))}${tag(valueName, money(amount))}</${variant}></${group}>`
    );
  };
  return (
    `<imposto><ICMS>${icmsGroup}</ICMS>${contribution(pis, 'PIS')}` +
    `${contribution(cofins, 'COFINS')}</imposto>`
  );
}
