import type {
  ParsedFiscalDetails,
  ParsedFiscalDeliveryAddress,
  ParsedFiscalInstallment,
} from '../types/fiscalDocuments.types';
import {
  getCardBrandLabel,
  getCardIntegrationLabel,
  getPaymentMethodLabel,
} from './fiscalPresentationHelpers';

interface FiscalXmlParser {
  parseFromString: (xml: string, mime: 'application/xml') => Document;
}

function getParser(): FiscalXmlParser | null {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    return {
      parseFromString: (xml, mime) => parser.parseFromString(xml, mime),
    };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DOMParser: XmldomParser } = require('@xmldom/xmldom');
    return new XmldomParser();
  } catch {
    return null;
  }
}

export function parseFiscalXmlDetails(xml: string): ParsedFiscalDetails | null {
  if (!xml || typeof xml !== 'string' || !xml.trim()) return null;
  const parser = getParser();
  if (!parser) return null;

  try {
    const parsed = parser.parseFromString(xml, 'application/xml');
    if (parsed.querySelector && parsed.querySelector('parsererror')) return null;

    const descendants = (root: Element | Document, name: string) =>
      Array.from(root.getElementsByTagNameNS('*', name));

    const value = (root: Element | Document, name: string) =>
      descendants(root, name)[0]?.textContent?.trim() || '';

    const infNfeNode = descendants(parsed, 'infNFe')[0] || parsed.documentElement;
    const totalsNode = descendants(parsed, 'ICMSTot')[0];
    const ideNode = descendants(infNfeNode, 'ide')[0];
    const issuerNode = descendants(infNfeNode, 'emit')[0];
    const issuerAddressNode = issuerNode ? descendants(issuerNode, 'enderEmit')[0] : undefined;
    const recipientNode = descendants(infNfeNode, 'dest')[0];
    const recipientAddressNode = recipientNode
      ? descendants(recipientNode, 'enderDest')[0]
      : undefined;
    const deliveryNode = descendants(parsed, 'entrega')[0];
    const totalNode = descendants(infNfeNode, 'total')[0];
    const additionalInfoNode = descendants(infNfeNode, 'infAdic')[0];
    const billingNode = descendants(infNfeNode, 'cobr')[0];
    const invoiceNode = billingNode ? descendants(billingNode, 'fat')[0] : undefined;
    const transportNode = descendants(parsed, 'transp')[0];
    const carrierNode = transportNode ? descendants(transportNode, 'transporta')[0] : undefined;
    const vehicleNode = transportNode ? descendants(transportNode, 'veicTransp')[0] : undefined;
    const volumeNode = transportNode ? descendants(transportNode, 'vol')[0] : undefined;
    const cobrNode = descendants(parsed, 'cobr')[0];

    const detNodes = descendants(parsed, 'det');
    if (detNodes.length === 0 && !totalsNode) {
      return null;
    }

    // Local de entrega diferenciado
    let deliveryAddress: ParsedFiscalDeliveryAddress | null = null;
    if (deliveryNode) {
      const dStreet = value(deliveryNode, 'xLgr');
      const dNum = value(deliveryNode, 'nro');
      const dCpl = value(deliveryNode, 'xCpl');
      const dDistrict = value(deliveryNode, 'xBairro');
      const dMun = value(deliveryNode, 'xMun');
      const dUf = value(deliveryNode, 'UF');
      const dCep = value(deliveryNode, 'CEP');

      const isDiff =
        dStreet !== (recipientAddressNode ? value(recipientAddressNode, 'xLgr') : '') ||
        dNum !== (recipientAddressNode ? value(recipientAddressNode, 'nro') : '') ||
        dMun !== (recipientAddressNode ? value(recipientAddressNode, 'xMun') : '');

      if (isDiff && (dStreet || dMun)) {
        deliveryAddress = {
          street: dStreet,
          number: dNum,
          complement: dCpl || undefined,
          district: dDistrict,
          municipality: dMun,
          state: dUf,
          postalCode: dCep || undefined,
        };
      }
    }

    // Parcelas / Duplicatas
    const dupNodes = cobrNode ? descendants(cobrNode, 'dup') : [];
    const installments: ParsedFiscalInstallment[] = dupNodes
      .map((dup) => ({
        number: value(dup, 'nDup'),
        dueDate: value(dup, 'dVenc'),
        value: value(dup, 'vDup'),
      }))
      .filter((dup) => dup.value || dup.dueDate);

    // Totais comerciais e fiscais
    const commercialLabels: Record<string, string> = {
      vProd: 'Produtos',
      vFrete: 'Frete',
      vSeg: 'Seguro',
      vDesc: 'Descontos',
      vOutro: 'Outras despesas',
      vNF: 'Total da NF-e',
    };

    const taxLabels: Record<string, string> = {
      vBC: 'Base ICMS',
      vICMS: 'ICMS',
      vBCST: 'Base ICMS-ST',
      vST: 'ICMS-ST',
      vIPI: 'IPI',
      vPIS: 'PIS',
      vCOFINS: 'COFINS',
      vTotTrib: 'Tributos aproximados',
    };

    const totalsList: Array<{ label: string; value: string; isTaxDetail?: boolean }> = [];
    if (totalsNode) {
      for (const [tag, label] of Object.entries(commercialLabels)) {
        const val = value(totalsNode, tag);
        if (val && (Number(val) > 0 || tag === 'vNF' || tag === 'vProd')) {
          totalsList.push({ label, value: val, isTaxDetail: false });
        }
      }
      for (const [tag, label] of Object.entries(taxLabels)) {
        const val = value(totalsNode, tag);
        if (val && Number(val) > 0) {
          totalsList.push({ label, value: val, isTaxDetail: true });
        }
      }
    }

    const trocoVal = value(parsed, 'vTroco');

    return {
      issuer: {
        name: issuerNode ? value(issuerNode, 'xNome') : '',
        taxId: issuerNode ? value(issuerNode, 'CNPJ') || value(issuerNode, 'CPF') : '',
        stateRegistration: issuerNode ? value(issuerNode, 'IE') : '',
        stateRegistrationSubstitute: issuerNode ? value(issuerNode, 'IEST') : '',
        street: issuerAddressNode ? value(issuerAddressNode, 'xLgr') : '',
        number: issuerAddressNode ? value(issuerAddressNode, 'nro') : '',
        complement: issuerAddressNode ? value(issuerAddressNode, 'xCpl') : '',
        district: issuerAddressNode ? value(issuerAddressNode, 'xBairro') : '',
        municipality: issuerAddressNode ? value(issuerAddressNode, 'xMun') : '',
        state: issuerAddressNode ? value(issuerAddressNode, 'UF') : '',
        postalCode: issuerAddressNode ? value(issuerAddressNode, 'CEP') : '',
        phone: issuerAddressNode ? value(issuerAddressNode, 'fone') : '',
      },
      general: {
        natureOperation: ideNode ? value(ideNode, 'natOp') : '',
        issueDate: ideNode ? value(ideNode, 'dhEmi') || value(ideNode, 'dEmi') : '',
        exitDate: ideNode ? value(ideNode, 'dhSaiEnt') || value(ideNode, 'dSaiEnt') : '',
        environment: ideNode ? value(ideNode, 'tpAmb') : '',
        model: ideNode ? value(ideNode, 'mod') : '',
        series: ideNode ? value(ideNode, 'serie') : '',
        number: ideNode ? value(ideNode, 'nNF') : '',
        operationType: ideNode ? value(ideNode, 'tpNF') : '',
        destination: ideNode ? value(ideNode, 'idDest') : '',
        finalConsumer: ideNode ? value(ideNode, 'indFinal') : '',
        presence: ideNode ? value(ideNode, 'indPres') : '',
        purpose: ideNode ? value(ideNode, 'finNFe') || '1' : '1',
        referencedKey: value(parsed, 'refNFe') || (ideNode ? value(ideNode, 'refNFe') : ''),
        total: totalNode ? value(totalNode, 'vNF') : '',
        additionalInfo: additionalInfoNode ? value(additionalInfoNode, 'infCpl') : '',
        taxAuthorityInfo: additionalInfoNode ? value(additionalInfoNode, 'infAdFisco') : '',
      },
      recipient: {
        name: recipientNode ? value(recipientNode, 'xNome') : '',
        taxId: recipientNode
          ? value(recipientNode, 'CNPJ') || value(recipientNode, 'CPF')
          : '',
        stateRegistration: recipientNode ? value(recipientNode, 'IE') : '',
        stateRegistrationIndicator: recipientNode ? value(recipientNode, 'indIEDest') : '',
        email: recipientNode ? value(recipientNode, 'email') : '',
        phone: recipientAddressNode ? value(recipientAddressNode, 'fone') : '',
        street: recipientAddressNode ? value(recipientAddressNode, 'xLgr') : '',
        number: recipientAddressNode ? value(recipientAddressNode, 'nro') : '',
        complement: recipientAddressNode ? value(recipientAddressNode, 'xCpl') : '',
        district: recipientAddressNode ? value(recipientAddressNode, 'xBairro') : '',
        municipality: recipientAddressNode ? value(recipientAddressNode, 'xMun') : '',
        municipalityCode: recipientAddressNode ? value(recipientAddressNode, 'cMun') : '',
        state: recipientAddressNode ? value(recipientAddressNode, 'UF') : '',
        postalCode: recipientAddressNode ? value(recipientAddressNode, 'CEP') : '',
        country: recipientAddressNode ? value(recipientAddressNode, 'xPais') : '',
        deliveryAddress,
      },
      items: detNodes.map((detail) => {
        const product = descendants(detail, 'prod')[0] || detail;
        const icms = descendants(detail, 'ICMS')[0];
        const icmsVariant = icms ? Array.from(icms.children)[0] : undefined;
        const taxNode = descendants(detail, 'imposto')[0];
        const ipiNode = taxNode ? descendants(taxNode, 'IPI')[0] : undefined;
        const ipiVariant = ipiNode ? Array.from(ipiNode.children)[0] : undefined;
        const pisNode = taxNode ? descendants(taxNode, 'PIS')[0] : undefined;
        const pisVariant = pisNode ? Array.from(pisNode.children)[0] : undefined;
        const cofinsNode = taxNode ? descendants(taxNode, 'COFINS')[0] : undefined;
        const cofinsVariant = cofinsNode ? Array.from(cofinsNode.children)[0] : undefined;

        const ean = value(product, 'cEAN');

        return {
          code: value(product, 'cProd'),
          description: value(product, 'xProd'),
          quantity: value(product, 'qCom'),
          unit: value(product, 'uCom'),
          unitValue: value(product, 'vUnCom'),
          discount: value(product, 'vDesc'),
          total: value(product, 'vProd'),
          ncm: value(product, 'NCM'),
          cfop: value(product, 'CFOP'),
          cst: icmsVariant
            ? value(icmsVariant, 'CST') || value(icmsVariant, 'CSOSN')
            : '',
          origin: icmsVariant ? value(icmsVariant, 'orig') : '',
          cest: value(product, 'CEST') || undefined,
          ean: ean && ean !== 'SEM GTIN' ? ean : undefined,
          icmsBase: icmsVariant ? value(icmsVariant, 'vBC') : '',
          icmsValue: icmsVariant ? value(icmsVariant, 'vICMS') : '',
          icmsRate: icmsVariant ? value(icmsVariant, 'pICMS') : '',
          ipiValue: ipiVariant ? value(ipiVariant, 'vIPI') : '',
          ipiRate: ipiVariant ? value(ipiVariant, 'pIPI') : '',
          pisRate: pisVariant ? value(pisVariant, 'pPIS') : '',
          pisValue: pisVariant ? value(pisVariant, 'vPIS') : '',
          cofinsRate: cofinsVariant ? value(cofinsVariant, 'pCOFINS') : '',
          cofinsValue: cofinsVariant ? value(cofinsVariant, 'vCOFINS') : '',
        };
      }),
      summary: {
        products: totalsNode ? value(totalsNode, 'vProd') : '',
        freight: totalsNode ? value(totalsNode, 'vFrete') : '',
        insurance: totalsNode ? value(totalsNode, 'vSeg') : '',
        discount: totalsNode ? value(totalsNode, 'vDesc') : '',
        otherExpenses: totalsNode ? value(totalsNode, 'vOutro') : '',
        importTax: totalsNode ? value(totalsNode, 'vII') : '',
        icmsBase: totalsNode ? value(totalsNode, 'vBC') : '',
        icmsValue: totalsNode ? value(totalsNode, 'vICMS') : '',
        icmsSubstitutionBase: totalsNode ? value(totalsNode, 'vBCST') : '',
        icmsSubstitutionValue: totalsNode ? value(totalsNode, 'vST') : '',
        ipiValue: totalsNode ? value(totalsNode, 'vIPI') : '',
        invoiceTotal: totalsNode ? value(totalsNode, 'vNF') : '',
      },
      totals: totalsList,
      transport: transportNode
        ? {
            modFrete: value(transportNode, 'modFrete'),
            freightValue: totalsNode ? value(totalsNode, 'vFrete') : '',
            carrierName: carrierNode ? value(carrierNode, 'xNome') : value(transportNode, 'xNome'),
            carrierTaxId: carrierNode
              ? value(carrierNode, 'CNPJ') || value(carrierNode, 'CPF')
              : value(transportNode, 'CNPJ') || value(transportNode, 'CPF'),
            carrierStateRegistration: carrierNode
              ? value(carrierNode, 'IE')
              : value(transportNode, 'IE'),
            carrierAddress: carrierNode ? value(carrierNode, 'xEnder') : '',
            carrierCity: carrierNode ? value(carrierNode, 'xMun') : '',
            carrierState: carrierNode ? value(carrierNode, 'UF') : '',
            vehiclePlate: vehicleNode ? value(vehicleNode, 'placa') : value(transportNode, 'placa'),
            vehicleState: vehicleNode ? value(vehicleNode, 'UF') : value(transportNode, 'UF'),
            vehicleRntc: vehicleNode ? value(vehicleNode, 'RNTC') : value(transportNode, 'RNTC'),
            volumeQuantity: volumeNode ? value(volumeNode, 'qVol') : value(transportNode, 'qVol'),
            volumeSpecies: volumeNode ? value(volumeNode, 'esp') : value(transportNode, 'esp'),
            volumeBrand: volumeNode ? value(volumeNode, 'marca') : '',
            volumeNumber: volumeNode ? value(volumeNode, 'nVol') : '',
            netWeight: volumeNode ? value(volumeNode, 'pesoL') : value(transportNode, 'pesoL'),
            grossWeight: volumeNode ? value(volumeNode, 'pesoB') : value(transportNode, 'pesoB'),
          }
        : null,
      billing: invoiceNode
        ? {
            number: value(invoiceNode, 'nFat'),
            originalValue: value(invoiceNode, 'vOrig'),
            discount: value(invoiceNode, 'vDesc'),
            netValue: value(invoiceNode, 'vLiq'),
          }
        : undefined,
      payments: descendants(parsed, 'detPag').map((payment) => {
        const method = value(payment, 'tPag');
        const indicator = value(payment, 'indPag');
        const cardNode = descendants(payment, 'card')[0];

        let cardInfo = undefined;
        if (cardNode) {
          const tBand = value(cardNode, 'tBand');
          const tpIntegra = value(cardNode, 'tpIntegra');
          const cAut = value(cardNode, 'cAut');
          if (tBand || tpIntegra || cAut) {
            cardInfo = {
              brand: getCardBrandLabel(tBand),
              integration: getCardIntegrationLabel(tpIntegra),
              authorization: cAut || undefined,
            };
          }
        }

        return {
          method: getPaymentMethodLabel(method),
          value: value(payment, 'vPag'),
          indicator: indicator || undefined,
          card: cardInfo,
        };
      }),
      installments: installments.length > 0 ? installments : undefined,
      changeValue: trocoVal && Number(trocoVal) > 0 ? trocoVal : undefined,
    };
  } catch {
    return null;
  }
}
