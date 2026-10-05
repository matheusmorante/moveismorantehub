import type {
  DeterminedTaxGroup,
  FiscalAddress,
  FiscalDocument,
  FiscalSnapshotCandidate,
} from './fiscalSnapshot';
import { validateFiscalDocument, type ApprovedFiscalRuleSet } from './fiscalCore';
import { ZERO_OWN_ICMS_CSOSNS, zeroOwnIcmsGroup } from '../../shared-utils/fiscalIcmsGroups';
import { decideFiscalRecipientRequirements } from '../../shared-utils/fiscalDocumentModel';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../shared-utils/recipientTaxId';

export type FiscalXmlIdentity = {
  accessKey: string;
  series: number;
  number: number;
  issuedAt: string;
};

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
const tag = (name: string, value: string | number) => `<${name}>${escapeXml(value)}</${name}>`;
const money = (value: number) => value.toFixed(2);
const decimal = (value: number, scale: number) => value.toFixed(scale);
function percent(value: number): string {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100 ||
    Math.abs(value * 10000 - Math.round(value * 10000)) > 0.000001
  )
    throw new Error('Alíquota fiscal inválida.');
  return value.toFixed(4);
}

function accessKeyDigit(base43: string): number {
  let sum = 0;
  for (let index = 42; index >= 0; index--) sum += Number(base43[index]) * (2 + ((42 - index) % 8));
  const digit = 11 - (sum % 11);
  return digit >= 10 ? 0 : digit;
}

function requireCode(value: string, pattern: RegExp, field: string): string {
  if (!pattern.test(value)) throw new Error(`${field} inválido para serialização fiscal.`);
  return value;
}

function addressXml(address: FiscalAddress, name: 'enderEmit' | 'enderDest'): string {
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

function taxAmount(tax: DeterminedTaxGroup, field: string): number {
  const value = tax.values[field];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
    throw new Error(`${tax.group}.${field} precisa de valor numérico decidido.`);
  return value;
}

function taxXml(taxes: ReadonlyArray<DeterminedTaxGroup>, origin: string): string {
  const icms = taxes.find((tax) => tax.group === 'ICMS');
  const pis = taxes.find((tax) => tax.group === 'PIS');
  const cofins = taxes.find((tax) => tax.group === 'COFINS');
  if (!icms || !pis || !cofins || taxes.some((tax) => tax.group === 'IPI'))
    throw new Error('Grupos tributários ausentes ou ainda não suportados pelo serializer.');
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

/** Pure internal-sale NF-e/NFC-e serialization, including online QR Code v3. */
export function serializeFiscalDocument(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument,
  ruleSet: ApprovedFiscalRuleSet,
  identity: FiscalXmlIdentity
): string {
  validateFiscalDocument(snapshot, document, ruleSet);
  const key = requireCode(identity.accessKey, /^\d{44}$/, 'Chave de acesso');
  requireCode(document.issuer.cnpj, /^\d{14}$/, 'CNPJ do emitente');
  if (
    document.issuer.address.uf !== 'PR' ||
    key.slice(0, 2) !== '41' ||
    document.issuer.municipalityCode !== document.issuer.address.municipalityCode ||
    key.slice(6, 20) !== document.issuer.cnpj.replace(/\D/g, '') ||
    key.slice(20, 22) !== document.model ||
    Number(key.slice(22, 25)) !== identity.series ||
    Number(key.slice(25, 34)) !== identity.number ||
    key[34] !== '1' ||
    Number(key[43]) !== accessKeyDigit(key.slice(0, 43)) ||
    !Number.isInteger(identity.number) ||
    identity.number < 1 ||
    !Number.isInteger(identity.series) ||
    identity.series < 1 ||
    identity.series > 999
  )
    throw new Error('Chave, emitente, modelo, série ou número fiscal não conferem.');
  const issuedAt = new Date(identity.issuedAt);
  if (
    Number.isNaN(issuedAt.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/.test(identity.issuedAt) ||
    key.slice(2, 6) !== identity.issuedAt.slice(2, 4) + identity.issuedAt.slice(5, 7)
  )
    throw new Error('Instante fiscal ou AAMM da chave inválidos.');
  const zoneOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    timeZoneName: 'longOffset',
  })
    .formatToParts(issuedAt)
    .find((part) => part.type === 'timeZoneName')
    ?.value.replace('GMT', '');
  if (zoneOffset !== identity.issuedAt.slice(-6))
    throw new Error('Offset de emissão não corresponde ao fuso de São Paulo.');
  const operation = document.operation;
  if (
    operation.direction !== 'outbound' ||
    operation.destination !== '1' ||
    operation.purpose !== '1' ||
    !/^[0-9]$/.test(operation.presence) ||
    !/^[012349]$/.test(operation.freightMode)
  )
    throw new Error('Operação fiscal não suportada pelo serializer.');
  if (
    document.model === '65' &&
    (snapshot.order.data.shipping as Record<string, unknown> | undefined)?.deliveryMethod ===
      'delivery' &&
    operation.presence !== '4'
  )
    throw new Error('NFC-e com entrega em domicílio exige indPres=4.');
  if (document.recipient.address && document.recipient.address.uf !== 'PR')
    throw new Error('NF-e interestadual ou exterior exige serializer fiscal próprio.');
  const recipientDoc = normalizeRecipientTaxId(document.recipient.cpfCnpj);
  const requirements = decideFiscalRecipientRequirements({
    model: document.model,
    presence: operation.presence,
    total: document.totals.invoice,
    personType: document.recipient.personType,
    recipientTaxId: recipientDoc,
    operationScope: 'NORMAL_DOMESTIC_SALE',
  });
  if (!requirements.supported)
    throw new Error(requirements.message || 'Matriz fiscal do destinatário não aplicável.');
  if (requirements.documentRequired && !recipientDoc)
    throw new Error(requirements.message || 'Documento do destinatário obrigatório.');
  if (
    recipientDoc &&
    (!isValidRecipientTaxId(recipientDoc) ||
      !recipientTaxIdMatchesPersonType(recipientDoc, document.recipient.personType))
  )
    throw new Error('Documento do destinatário inválido ou incompatível com PF/PJ.');
  if (requirements.addressRequired && !document.recipient.address)
    throw new Error('Endereço do destinatário obrigatório para esta operação.');
  if (
    document.model === '65' &&
    (operation.finalConsumer !== '1' ||
      document.recipient.ieIndicator !== '9' ||
      document.totals.invoice >= 200000)
  )
    throw new Error('Operação incompatível com NFC-e.');
  if (
    !['1', '2', '9'].includes(document.recipient.ieIndicator) ||
    (document.recipient.ieIndicator === '1' && !document.recipient.ie)
  )
    throw new Error('Condição de contribuinte do destinatário incompleta.');
  const effectivePresence = operation.presence;
  const ide =
    `<ide>${tag('cUF', '41')}${tag('cNF', key.slice(35, 43))}` +
    `${tag('natOp', operation.natureOfOperation)}${tag('mod', document.model)}` +
    `${tag('serie', identity.series)}${tag('nNF', identity.number)}` +
    `${tag('dhEmi', identity.issuedAt)}${tag('tpNF', '1')}` +
    `${tag('idDest', operation.destination)}${tag('cMunFG', document.issuer.municipalityCode)}` +
    `${tag('tpImp', document.model === '65' ? '4' : '1')}${tag('tpEmis', '1')}${tag('cDV', key[43])}` +
    `${tag('tpAmb', document.environment)}${tag('finNFe', operation.purpose)}` +
    `${tag('indFinal', operation.finalConsumer)}${tag('indPres', effectivePresence)}` +
    `${tag('procEmi', '0')}${tag('verProc', 'MoranteHub_1.0')}</ide>`;
  const issuer =
    `<emit>${tag('CNPJ', document.issuer.cnpj)}` +
    `${tag('xNome', document.issuer.name)}${addressXml(document.issuer.address, 'enderEmit')}` +
    `${tag('IE', document.issuer.ie)}${tag('CRT', document.issuer.crt)}</emit>`;
  const recipient =
    !recipientDoc && document.model === '65'
      ? ''
      : `<dest>${recipientDoc ? tag(recipientDoc.length === 11 ? 'CPF' : 'CNPJ', recipientDoc) : ''}` +
        `${tag('xNome', document.environment === 2 ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : document.recipient.name)}` +
        `${document.recipient.address ? addressXml(document.recipient.address, 'enderDest') : ''}` +
        `${tag('indIEDest', document.recipient.ieIndicator)}` +
        `${document.recipient.ie ? tag('IE', document.recipient.ie) : ''}</dest>`;
  const items = document.items
    .map((item) => {
      const p = item.product;
      const c = item.classification;
      requireCode(c.ncm, /^\d{8}$/, `NCM do item ${item.itemNumber}`);
      requireCode(c.cfop, /^[567]\d{3}$/, `CFOP do item ${item.itemNumber}`);
      if (!c.cfop.startsWith('5'))
        throw new Error(`CFOP do item ${item.itemNumber} não corresponde ao destino.`);
      requireCode(c.origin, /^[0-8]$/, `Origem do item ${item.itemNumber}`);
      const product =
        `<prod>${tag('cProd', p.code)}${tag('cEAN', p.gtin)}` +
        `${tag('xProd', document.environment === 2 && item.itemNumber === 1 ? 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' : p.description)}` +
        `${tag('NCM', c.ncm)}${c.cest ? tag('CEST', requireCode(c.cest, /^\d{7}$/, 'CEST')) : ''}` +
        `${c.benefitCode ? tag('cBenef', c.benefitCode) : ''}${tag('CFOP', c.cfop)}` +
        `${tag('uCom', c.unit)}${tag('qCom', decimal(p.quantity, 4))}` +
        `${tag('vUnCom', decimal(p.unitValue, 4))}${tag('vProd', money(p.gross))}` +
        `${tag('cEANTrib', p.gtin)}${tag('uTrib', c.unit)}` +
        `${tag('qTrib', decimal(p.quantity, 4))}${tag('vUnTrib', decimal(p.unitValue, 4))}` +
        `${p.freight ? tag('vFrete', money(p.freight)) : ''}` +
        `${p.insurance ? tag('vSeg', money(p.insurance)) : ''}` +
        `${p.discount ? tag('vDesc', money(p.discount)) : ''}` +
        `${p.otherExpenses ? tag('vOutro', money(p.otherExpenses)) : ''}` +
        `${tag('indTot', '1')}</prod>`;
      return `<det nItem="${item.itemNumber}">${product}${taxXml(item.taxes, c.origin)}</det>`;
    })
    .join('');
  const t = document.totals;
  const total =
    `<total><ICMSTot>${tag('vBC', money(t.icmsBase))}` +
    `${tag('vICMS', money(t.icms))}${tag('vICMSDeson', money(t.icmsExempt))}` +
    `${tag('vFCP', money(t.fcp))}${tag('vBCST', money(t.icmsStBase))}` +
    `${tag('vST', money(t.icmsSt))}${tag('vFCPST', money(t.fcpSt))}` +
    `${tag('vFCPSTRet', money(t.fcpStRetained))}${tag('vProd', money(t.products))}` +
    `${tag('vFrete', money(t.freight))}${tag('vSeg', money(t.insurance))}` +
    `${tag('vDesc', money(t.discount))}${tag('vII', money(t.ii))}` +
    `${tag('vIPI', money(t.ipi))}${tag('vIPIDevol', money(t.ipiReturned))}` +
    `${tag('vPIS', money(t.pis))}${tag('vCOFINS', money(t.cofins))}` +
    `${tag('vOutro', money(t.otherExpenses))}${tag('vNF', money(t.invoice))}</ICMSTot></total>`;
  const payments = `<pag>${document.payments
    .map((payment) => {
      requireCode(payment.methodCode, /^\d{2}$/, 'Meio de pagamento');
      if (document.model === '65' && ['03', '04'].includes(payment.methodCode) && !payment.card)
        throw new Error('Dados de integração do cartão ausentes para NFC-e.');
      return (
        `<detPag>${tag('tPag', payment.methodCode)}${tag('vPag', money(payment.amount))}` +
        `${
          payment.card
            ? '<card>' +
              tag(
                'tpIntegra',
                requireCode(payment.card.integrationType, /^[12]$/, 'Integração cartão')
              ) +
              (payment.card.acquirerCnpj
                ? tag('CNPJ', requireCode(payment.card.acquirerCnpj, /^\d{14}$/, 'CNPJ adquirente'))
                : '') +
              (payment.card.brand
                ? tag('tBand', requireCode(payment.card.brand, /^\d{2}$/, 'Bandeira'))
                : '') +
              (payment.card.authorization ? tag('cAut', payment.card.authorization) : '') +
              '</card>'
            : ''
        }</detPag>`
      );
    })
    .join('')}${t.change ? tag('vTroco', money(t.change)) : ''}</pag>`;
  const transporter = operation.transporter;
  if (
    transporter &&
    (!transporter.name ||
      !isValidRecipientTaxId(transporter.cnpj || transporter.cpf || '') ||
      (transporter.cnpj ? normalizeRecipientTaxId(transporter.cnpj).length !== 14 : false) ||
      (transporter.cpf ? normalizeRecipientTaxId(transporter.cpf).length !== 11 : false))
  )
    throw new Error('Identificação do transportador incompleta.');
  const requiresHomeDeliveryTransportGroup = document.model === '65' && operation.presence === '4';
  const transport = `<transp>${tag('modFrete', operation.freightMode)}${
    transporter
      ? '<transporta>' +
        tag(transporter.cnpj ? 'CNPJ' : 'CPF', transporter.cnpj || transporter.cpf || '') +
        tag('xNome', transporter.name) +
        (transporter.ie ? tag('IE', transporter.ie) : '') +
        (transporter.address ? tag('xEnder', transporter.address) : '') +
        (transporter.city ? tag('xMun', transporter.city) : '') +
        (transporter.uf ? tag('UF', transporter.uf) : '') +
        '</transporta>'
      : requiresHomeDeliveryTransportGroup
        ? '<transporta/>'
        : ''
  }</transp>`;
  const supplement =
    document.model === '65'
      ? '<infNFeSupl><qrCode><![CDATA[' +
        `http://www.fazenda.pr.gov.br/nfce/qrcode?p=${key}|3|${document.environment}` +
        ']]></qrCode><urlChave>http://www.fazenda.pr.gov.br/nfce/consulta</urlChave></infNFeSupl>'
      : '';
  return (
    `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
    `<infNFe Id="NFe${key}" versao="4.00">${ide}${issuer}${recipient}${items}${total}` +
    `${transport}${payments}</infNFe>${supplement}</NFe>`
  );
}
