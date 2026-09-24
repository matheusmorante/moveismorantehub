import Order from "@/pages/types/order.type";

export interface DanfeRecipientParams {
    order: Order;
    isHomologacao: boolean;
    dtEmi: string;
    dtSaida: string;
    hrSaida: string;
}

/**
 * Constrói o BLOCO 3: DESTINATÁRIO / REMETENTE do DANFE oficial A4.
 */
export function buildDanfeRecipientOfficialHtml(params: DanfeRecipientParams): string {
    const { order, isHomologacao, dtEmi, dtSaida, hrSaida } = params;
    const customer = order.customerData;
    const destName = isHomologacao
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
        : (customer?.fullName || 'CONSUMIDOR FINAL');
    const destDoc = customer?.cpfCnpj || '';
    const destLogr = order.shipping?.deliveryAddress?.street || customer?.fullAddress?.street || '';
    const destNum = order.shipping?.deliveryAddress?.number || customer?.fullAddress?.number || 'S/N';
    const destBairro = order.shipping?.deliveryAddress?.neighborhood || customer?.fullAddress?.neighborhood || '';
    const destCep = order.shipping?.deliveryAddress?.cep || customer?.fullAddress?.cep || '';
    const destMun = order.shipping?.deliveryAddress?.city || customer?.fullAddress?.city || 'Colombo';
    const destUF = order.shipping?.deliveryAddress?.state || customer?.fullAddress?.state || 'PR';
    const destPhone = customer?.phone || '';
    const destIE = (customer as any)?.rgIe || 'ISENTO';

    return `
        <!-- BLOCO 3: DESTINATÁRIO / REMETENTE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
            <tr>
                <td colspan="4" style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    DESTINATÁRIO / REMETENTE
                </td>
            </tr>
            <tr>
                <td style="width: 58%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">NOME / RAZÃO SOCIAL</div>
                    <div class="box-value">${destName}</div>
                </td>
                <td style="width: 24%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CNPJ / CPF</div>
                    <div class="box-value">${destDoc || '&nbsp;'}</div>
                </td>
                <td colspan="2" style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DATA DA EMISSÃO</div>
                    <div class="box-value text-right">${dtEmi}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 48%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">ENDEREÇO</div>
                    <div class="box-value">${destLogr ? `${destLogr}, ${destNum}` : 'RETIRADA NO ESTABELECIMENTO'}</div>
                </td>
                <td style="width: 24%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">BAIRRO / DISTRITO</div>
                    <div class="box-value">${destBairro || '&nbsp;'}</div>
                </td>
                <td style="width: 13%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">CEP</div>
                    <div class="box-value">${destCep || '&nbsp;'}</div>
                </td>
                <td style="width: 15%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DATA DE SAÍDA/ENTRADA</div>
                    <div class="box-value text-right">${dtSaida}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 38%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">MUNICÍPIO</div>
                    <div class="box-value">${destMun}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">FONE / FAX</div>
                    <div class="box-value">${destPhone || '&nbsp;'}</div>
                </td>
                <td style="width: 6%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">UF</div>
                    <div class="box-value text-center">${destUF}</div>
                </td>
                <td style="width: 18%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">INSCRIÇÃO ESTADUAL</div>
                    <div class="box-value">${destIE}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">HORA DE SAÍDA</div>
                    <div class="box-value text-right">${hrSaida}</div>
                </td>
            </tr>
        </table>
    `;
}
