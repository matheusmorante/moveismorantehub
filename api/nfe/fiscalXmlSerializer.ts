import { decideFiscalRecipientRequirements } from '../../shared-utils/fiscalDocumentModel';
import {
  isValidRecipientTaxId,
  normalizeRecipientTaxId,
  recipientTaxIdMatchesPersonType,
} from '../../shared-utils/recipientTaxId';
import { type ApprovedFiscalRuleSet, validateFiscalDocument } from './fiscalCore';
import type { FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';
import { isNormalSaleRuleSet } from './normal-sale/constants';
import { serializeFiscalItems } from './xml/fiscalItemXml';
import { accessKeyDigit, addressXml, dateOnly, money, requireCode, tag } from './xml/xmlPrimitives';

export type FiscalXmlIdentity = {
  accessKey: string;
  series: number;
  number: number;
  issuedAt: string;
};

/** Pure internal-sale NF-e/NFC-e serialization, including PR online QR Code v3. */
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
    identity.series < 0 ||
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
  const destination = operation.destination;
  if (
    operation.direction !== 'outbound' ||
    (destination !== '1' && destination !== '2') ||
    operation.purpose !== '1' ||
    !/^[0-9]$/.test(operation.presence) ||
    !/^[012349]$/.test(operation.freightMode)
  )
    throw new Error('Operação fiscal não suportada pelo serializer.');
  if (document.model === '65' && operation.destination !== '1')
    throw new Error('NFC-e não permite operação interestadual.');
  if (isNormalSaleRuleSet(document.ruleSetVersion) && operation.destination !== '1')
    throw new Error(
      `${document.ruleSetVersion} não gera XML interestadual sem uma matriz tributária aprovada.`
    );
  if (
    document.model === '65' &&
    (snapshot.order.data.shipping as Record<string, unknown> | undefined)?.deliveryMethod ===
      'delivery' &&
    operation.presence !== '4'
  )
    throw new Error('NFC-e com entrega em domicílio exige indPres=4.');
  if (
    document.model === '65' &&
    document.recipient.address &&
    document.recipient.address.uf !== 'PR'
  )
    throw new Error('NFC-e não permite destinatário fora do estado.');
  if (
    operation.destination === '1' &&
    document.recipient.address &&
    document.recipient.address.uf !== 'PR'
  ) {
    const isPickup =
      (snapshot.order.data.shipping as Record<string, unknown> | undefined)?.deliveryMethod ===
      'pickup';
    if (!isPickup) {
      throw new Error('Operação interna (idDest=1) com entrega fora do estado é incoerente.');
    }
  }
  if (
    operation.destination === '2' &&
    document.recipient.address &&
    document.recipient.address.uf === 'PR'
  )
    throw new Error('Operação interestadual (idDest=2) exige destinatário com UF diferente de PR.');
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
        `${tag('indIEDest', document.model === '65' ? '9' : document.recipient.ieIndicator)}` +
        `${document.model !== '65' && document.recipient.ie && document.recipient.ieIndicator !== '2' ? tag('IE', document.recipient.ie) : ''}</dest>`;
  const items = serializeFiscalItems(document);
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
      if (
        document.model === '65' &&
        ['03', '04', '17'].includes(payment.methodCode) &&
        !payment.card
      )
        throw new Error('Dados de integração do cartão/PIX ausentes para NFC-e.');
      const paymentDescription = payment.description?.trim();
      if (
        payment.methodCode === '99' &&
        (!paymentDescription || paymentDescription.length < 2 || paymentDescription.length > 60)
      )
        throw new Error(
          'Descreva o meio de pagamento classificado como Outros (2 a 60 caracteres).'
        );
      return (
        `<detPag>${payment.paymentIndicator ? tag('indPag', requireCode(payment.paymentIndicator, /^[01]$/, 'Indicador do pagamento')) : ''}` +
        `${tag('tPag', payment.methodCode)}` +
        `${payment.methodCode === '99' ? tag('xPag', paymentDescription!) : ''}` +
        `${tag('vPag', money(payment.amount))}` +
        `${payment.paymentDate ? tag('dPag', dateOnly(payment.paymentDate, 'Data real do pagamento')) : ''}` +
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
  const billing =
    document.model === '55' && document.billingInstallments?.length
      ? `<cobr>${document.billingInstallments
          .map((installment) => {
            if (!/^\d{1,60}$/.test(installment.number))
              throw new Error('Número da duplicata inválido.');
            if (!Number.isFinite(installment.amount) || installment.amount <= 0)
              throw new Error('Valor da duplicata inválido.');
            return (
              `<dup>${tag('nDup', installment.number)}` +
              `${installment.dueDate ? tag('dVenc', dateOnly(installment.dueDate, 'Data de vencimento')) : ''}` +
              `${tag('vDup', money(installment.amount))}</dup>`
            );
          })
          .join('')}</cobr>`
      : '';
  if (billing) {
    const billingCents = document.billingInstallments!.reduce(
      (sum, installment) => sum + Math.round(installment.amount * 100),
      0
    );
    const deferredCents = document.payments.reduce(
      (sum, payment) =>
        sum + (payment.paymentIndicator === '1' ? Math.round(payment.amount * 100) : 0),
      0
    );
    if (billingCents !== deferredCents)
      throw new Error('As duplicatas não correspondem aos valores informados a prazo.');
  }
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
    `${transport}${billing}${payments}</infNFe>${supplement}</NFe>`
  );
}
