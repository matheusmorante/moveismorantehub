import Order from "@/pages/types/order.type";
import { AppSettings } from "../../settingsService";
import { formatCurrency } from "../../formatters";

export function buildDanfeItemsHtml(order: Order, settings: AppSettings): string {
    const itemsRows = (order.items || []).map((item, idx) => {
        const itemIndex = idx + 1;
        const qCom = item.quantity || 1;
        const vUnCom = Number(item.unitPrice || 0);
        const itemDiscount = Number(item.unitDiscount || 0) * qCom;
        const vProd = qCom * vUnCom - itemDiscount;
        const fiscal = (item as any).fiscal || (settings as any).fiscalDefaults || {};
        const ncm = fiscal.ncm || '94036000';
        const cfop = fiscal.cfop || '5102';
        const cst = fiscal.cst || '102';

        return `
            <tr>
                <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">${itemIndex}</td>
                <td style="padding: 4px; border: 1px solid #cbd5e1;">${item.description}</td>
                <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">${ncm}</td>
                <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">${cst}</td>
                <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">${cfop}</td>
                <td style="text-align:center; padding: 4px; border: 1px solid #cbd5e1;">UN</td>
                <td style="text-align:right; padding: 4px; border: 1px solid #cbd5e1;">${qCom}</td>
                <td style="text-align:right; padding: 4px; border: 1px solid #cbd5e1;">${formatCurrency(vUnCom)}</td>
                <td style="text-align:right; padding: 4px; border: 1px solid #cbd5e1;">${formatCurrency(vProd)}</td>
            </tr>
        `;
    }).join('');

    return `
        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">Item</th>
                    <th>Descrição do Produto</th>
                    <th style="width: 65px;">NCM</th>
                    <th style="width: 40px;">CST</th>
                    <th style="width: 45px;">CFOP</th>
                    <th style="width: 30px;">Unid</th>
                    <th style="width: 40px;">Qtd</th>
                    <th style="width: 75px;">Vlr Unit</th>
                    <th style="width: 80px;">Vlr Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows}
            </tbody>
        </table>
    `;
}
