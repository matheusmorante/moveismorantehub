import type Order from '@/pages/types/order.type';
import {
  HOMOLOGATION_FIRST_ITEM_DESCRIPTION,
  shouldUseHomologationFirstItemDescription,
} from '../../../../../../shared-utils/fiscalDocumentModel';
import { zeroOwnIcmsGroup } from '../../../../../../shared-utils/fiscalIcmsGroups';
import type { AppSettings } from '../../settingsService';
import { composeServiceFiscalValues, fiscalMoneyFromCents } from '../serviceFiscalComposition';
import { escapeXml } from './xmlEmitterBlock';

export interface BuildItemsResult {
  itemsXml: string;
  vProdTotal: number;
  vDescTotal: number;
}

export function buildItemsXml(
  order: Order,
  settings: AppSettings,
  isHomologacao: boolean,
  model: '55' | '65'
): BuildItemsResult {
  let vProdTotal = 0;
  let vDescTotal = 0;

  const composition = composeServiceFiscalValues(order.items || []);
  const itemsXml = composition.products
    .map(({ item, itemIndex: sourceIndex, vProdCents, vDescCents }, index) => {
      const itemIndex = index + 1;
      const qCom = item.quantity || 1;
      const vProd = fiscalMoneyFromCents(vProdCents);
      const itemDiscount = fiscalMoneyFromCents(vDescCents);
      const vUnCom = vProd / qCom;

      vProdTotal += vProd;
      vDescTotal += itemDiscount;

      const fiscal = (item as any).fiscal || (settings as any).fiscalDefaults || {};
      const ncm = String((item as any).fiscal?.ncm || '').replace(/\D/g, '');
      const cest = (fiscal.cest || '').replace(/\D/g, '');
      const cfop = fiscal.cfop || '5102';
      const csosn = String((item as any).fiscal?.cst || '');
      if (settings.companyCRT !== '1') throw new Error('CSOSN exige emitente CRT 1 neste gerador.');
      const icmsGroup = zeroOwnIcmsGroup(csosn);
      const origem = fiscal.origem || '0';
      const cProd = String(item.code || item.productId || String(sourceIndex + 1)).slice(0, 60);
      const desc = escapeXml(item.description);
      // The compatibility builder maps model 65 to tpImp=4 and model 55 to tpImp=1.
      const isHomologationFirstItem =
        itemIndex === 1 &&
        shouldUseHomologationFirstItemDescription({
          model,
          environment: isHomologacao ? 2 : 1,
          printType: model === '65' ? '4' : '1',
        });
      const xProd = isHomologationFirstItem
        ? HOMOLOGATION_FIRST_ITEM_DESCRIPTION
        : desc.slice(0, 120);

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
          <${icmsGroup}>
            <orig>${origem}</orig>
            <CSOSN>${csosn}</CSOSN>
          </${icmsGroup}>
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
    })
    .join('');

  return { itemsXml, vProdTotal, vDescTotal };
}
