import Order from "@/pages/types/order.type";
import { AppSettings } from "../../settingsService";
import { escapeXml } from "./xmlEmitterBlock";

export interface BuildItemsResult {
    itemsXml: string;
    vProdTotal: number;
    vDescTotal: number;
}

export function buildItemsXml(order: Order, settings: AppSettings, isHomologacao: boolean): BuildItemsResult {
    let vProdTotal = 0;
    let vDescTotal = 0;

    const itemsXml = (order.items || []).map((item, index) => {
        const itemIndex = index + 1;
        const qCom = item.quantity || 1;
        const vUnCom = Number(item.unitPrice || 0);
        const itemDiscount = Number(item.unitDiscount || 0) * qCom;
        const vProd = qCom * vUnCom;
        
        vProdTotal += vProd;
        vDescTotal += itemDiscount;

        const fiscal = (item as any).fiscal || (settings as any).fiscalDefaults || {};
        const ncm = (fiscal.ncm || '94036000').replace(/\D/g, '').padStart(8, '0');
        const cest = (fiscal.cest || '').replace(/\D/g, '');
        const cfop = fiscal.cfop || '5102';
        const csosn = fiscal.cst || '102';
        const origem = fiscal.origem || '0';
        const cProd = item.code || item.productId || String(itemIndex);
        const xProd = isHomologacao 
            ? `NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL (${escapeXml(item.description)})`
            : escapeXml(item.description);

        return `
    <det nItem="${itemIndex}">
      <prod>
        <cProd>${escapeXml(cProd)}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${xProd}</xProd>
        <NCM>${ncm}</NCM>
        ${cest ? `<CEST>${cest}</CEST>` : ''}
        <CFOP>${cfop}</CFOP>
        <uCom>UN</uCom>
        <qCom>${qCom.toFixed(4)}</qCom>
        <vUnCom>${vUnCom.toFixed(4)}</vUnCom>
        <vProd>${vProd.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>${qCom.toFixed(4)}</qTrib>
        <vUnTrib>${vUnCom.toFixed(4)}</vUnTrib>
        ${itemDiscount > 0 ? `<vDesc>${itemDiscount.toFixed(2)}</vDesc>` : ''}
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN${csosn}>
            <orig>${origem}</orig>
            <CSOSN>${csosn}</CSOSN>
          </ICMSSN${csosn}>
        </ICMS>
        <PIS>
          <PISOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pPIS>0.00</pPIS>
            <vPIS>0.00</vPIS>
          </PISOutr>
        </PIS>
        <COFINS>
          <COFINSOutr>
            <CST>49</CST>
            <vBC>0.00</vBC>
            <pCOFINS>0.00</pCOFINS>
            <vCOFINS>0.00</vCOFINS>
          </COFINSOutr>
        </COFINS>
      </imposto>
    </det>`;
    }).join('');

    return { itemsXml, vProdTotal, vDescTotal };
}
