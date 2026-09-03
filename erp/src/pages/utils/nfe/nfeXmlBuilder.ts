import Order from "@/pages/types/order.type";
import { AppSettings } from "../settingsService";
import { buildIdeXml, buildEmitXml } from "./xml/xmlEmitterBlock";
import { buildDestXml } from "./xml/xmlDestBlock";
import { buildItemsXml } from "./xml/xmlItemsBlock";
import { buildTotalsAndPaymentXml } from "./xml/xmlTotalsBlock";

export interface NfeXmlBuilderParams {
    order: Order;
    settings: AppSettings;
    accessKey: string;
    randomCode: string;
    checkDigit: number;
    nfeNumber: number;
    series: string;
    model: '55' | '65'; // 55 = NF-e, 65 = NFC-e
    environment: 1 | 2; // 1 = Produção, 2 = Homologação
}

/**
 * Constrói o XML oficial da NF-e / NFC-e no Layout 4.00 da SEFAZ
 */
export function buildNfeXml(params: NfeXmlBuilderParams): string {
    const { order, settings, accessKey, randomCode, checkDigit, nfeNumber, series, model, environment } = params;
    const isHomologacao = environment === 2;
    const now = new Date();
    const dhEmi = now.toISOString().replace(/\.\d{3}Z$/, '-03:00');

    // 1. Bloco de Identificação (<ide>)
    const ideXml = buildIdeXml({
        accessKey,
        randomCode,
        checkDigit,
        nfeNumber,
        series,
        model,
        environment,
        dhEmi
    });

    // 2. Bloco do Emitente (<emit>)
    const emitXml = buildEmitXml(settings);

    // 3. Bloco do Destinatário (<dest>)
    const destXml = buildDestXml(order, isHomologacao);

    // 4. Bloco de Produtos e Impostos (<det>)
    const { itemsXml, vProdTotal, vDescTotal } = buildItemsXml(order, settings, isHomologacao);

    // 5. Bloco de Totais, Transporte, Pagamento e Informações Adicionais (<total>, <transp>, <pag>, <infAdic>)
    const totalsXml = buildTotalsAndPaymentXml(order, vProdTotal, vDescTotal);

    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${accessKey}" versao="4.00">${ideXml}${emitXml}${destXml}${itemsXml}${totalsXml}
  </infNFe>
</NFe>`;
}
