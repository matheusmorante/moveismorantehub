import { formatCurrency } from "../../formatters";

export interface DanfeTaxesAndTotalsParams {
    totalOrder: number;
    totalProd: number;
    freight: number;
    discount: number;
}

/**
 * Constrói os BLOCOS 4 (FATURA/DUPLICATAS) e 5 (CÁLCULO DO IMPOSTO) do DANFE oficial A4.
 */
export function buildDanfeTaxesAndTotalsOfficialHtml(params: DanfeTaxesAndTotalsParams): string {
    const { totalOrder, totalProd, freight, discount } = params;

    const formattedTotalProd = formatCurrency(totalProd).replace('R$', '').trim();
    const formattedFreight = formatCurrency(freight).replace('R$', '').trim();
    const formattedDiscount = formatCurrency(discount).replace('R$', '').trim();

    return `
        <!-- BLOCO 4: FATURA / DUPLICATAS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    FATURA / DUPLICATAS
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid #000; padding: 2px 4px; font-size: 7.5px;">
                    PAGAMENTO À VISTA / CONFORME COMPROVANTE &bull; VALOR: <strong>${formatCurrency(totalOrder)}</strong>
                </td>
            </tr>
        </table>

        <!-- BLOCO 5: CÁLCULO DO IMPOSTO -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="5" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    CÁLCULO DO IMPOSTO
                </td>
            </tr>
            <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BASE DE CÁLCULO DO ICMS</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO ICMS</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BASE CÁLC. ICMS SUBST.</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO ICMS SUBST.</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR TOTAL DOS PRODUTOS</div>
                    <div class="box-value text-right">${formattedTotalProd}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO FRETE</div>
                    <div class="box-value text-right">${formattedFreight}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO SEGURO</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DESCONTO</div>
                    <div class="box-value text-right">${formattedDiscount}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">OUTRAS DESPESAS ACESS.</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR TOTAL DO IPI</div>
                    <div class="box-value text-right">0,00</div>
                </td>
            </tr>
            <tr>
                <td colspan="4" style="border: 1px solid #000; padding: 1px 3px; background: #fafafa;">
                    &nbsp;
                </td>
                <td style="border: 1px solid #000; padding: 1px 3px; background: #e2e8f0;">
                    <div class="box-title font-black">VALOR TOTAL DA NOTA</div>
                    <div class="box-value text-right font-black" style="font-size:10px;">${formatCurrency(totalOrder)}</div>
                </td>
            </tr>
        </table>
    `;
}
