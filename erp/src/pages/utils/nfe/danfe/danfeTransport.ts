import Order from "@/pages/types/order.type";

/**
 * Constrói o BLOCO 6: TRANSPORTADOR / VOLUMES TRANSPORTADOS do DANFE oficial A4.
 */
export function buildDanfeTransportOfficialHtml(order: Order): string {
    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const volumeCount = order.items?.length || 1;

    return `
        <!-- BLOCO 6: TRANSPORTADOR / VOLUMES TRANSPORTADOS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="6" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    TRANSPORTADOR / VOLUMES TRANSPORTADOS
                </td>
            </tr>
            <tr>
                <td style="width: 40%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">RAZÃO SOCIAL</div>
                    <div class="box-value">${isPickup ? 'RETIRADA PELO DESTINATÁRIO' : 'O PRÓPRIO EMITENTE'}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">FRETE POR CONTA</div>
                    <div class="box-value">${isPickup ? '9-Sem Ocorrência de Transporte' : '0-Emitente (CIF)'}</div>
                </td>
                <td style="width: 10%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CÓDIGO ANTT</div>
                    <div class="box-value">&nbsp;</div>
                </td>
                <td style="width: 12%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PLACA DO VEÍCULO</div>
                    <div class="box-value">&nbsp;</div>
                </td>
                <td style="width: 4%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">UF</div>
                    <div class="box-value">&nbsp;</div>
                </td>
                <td style="width: 14%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CNPJ / CPF</div>
                    <div class="box-value">&nbsp;</div>
                </td>
            </tr>
            <tr>
                <td style="width: 12%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">QUANTIDADE</div>
                    <div class="box-value text-right">${volumeCount}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">ESPÉCIE</div>
                    <div class="box-value">VOLUMES</div>
                </td>
                <td style="width: 15%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">MARCA</div>
                    <div class="box-value">&nbsp;</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">NUMERAÇÃO</div>
                    <div class="box-value">&nbsp;</div>
                </td>
                <td style="width: 17%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PESO BRUTO</div>
                    <div class="box-value text-right">0,000</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">PESO LÍQUIDO</div>
                    <div class="box-value text-right">0,000</div>
                </td>
            </tr>
        </table>
    `;
}
