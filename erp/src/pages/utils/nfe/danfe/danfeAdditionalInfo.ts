import Order from "@/pages/types/order.type";

/**
 * Constrói o BLOCO 8: DADOS ADICIONAIS / RESERVADO AO FISCO do DANFE oficial A4.
 */
export function buildDanfeAdditionalInfoOfficialHtml(order: Order): string {
    const orderIdentifier = order.orderIndex || order.id;
    const observationText = order.observation ? `Observações do Pedido: ${order.observation}` : '';

    return `
        <!-- BLOCO 8: DADOS ADICIONAIS / RESERVADO AO FISCO -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px;">
            <tr>
                <td style="width: 70%; background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    INFORMAÇÕES COMPLEMENTARES
                </td>
                <td style="width: 30%; background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    RESERVADO AO FISCO
                </td>
            </tr>
            <tr>
                <td style="width: 70%; border: 1px solid #000; padding: 4px; font-size: 7.5px; vertical-align: top; line-height: 1.25;">
                    <strong>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL.</strong><br>
                    NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI / ICMS.<br>
                    Referente ao Pedido de Venda #${orderIdentifier}.<br>
                    ${observationText}
                </td>
                <td style="width: 30%; border: 1px solid #000; padding: 4px; font-size: 7.5px; vertical-align: top;">
                    &nbsp;
                </td>
            </tr>
        </table>
    `;
}
