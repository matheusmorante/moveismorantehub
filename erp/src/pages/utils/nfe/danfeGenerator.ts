import Order from "@/pages/types/order.type";
import { AppSettings } from "../settingsService";
import { formatCurrency, formatToBRDate } from "../formatters";
import { formatAccessKey } from "./nfeAccessKey";
import { getDanfeOfficialStyles } from "./danfe/danfeStyles";
import { buildDanfeHeaderOfficialHtml } from "./danfe/danfeHeader";
import { buildDanfeItemsOfficialHtml } from "./danfe/danfeItemsTable";

export interface DanfeData {
    order: Order;
    settings: AppSettings;
    accessKey: string;
    nfeNumber: number;
    series: string;
    protocolNumber: string;
    protocolDate: string;
    model: '55' | '65';
    environment: 1 | 2;
    status: 'autorizada' | 'homologada' | 'pendente';
    natOp?: string;
}

/**
 * Gera o documento HTML do DANFE oficial A4 Retrato 100% conforme MOC 7.0 (Anexo II)
 */
export function generateDanfeHtml(data: DanfeData): string {
    const { order, settings, accessKey, nfeNumber, series, protocolNumber, protocolDate, model, environment } = data;
    const isHomologacao = environment === 2;
    const formattedKey = formatAccessKey(accessKey);
    const docTitle = model === '65' ? 'DANFE NFC-e' : 'DANFE NF-e';

    const customer = order.customerData;
    const destName = isHomologacao 
        ? 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' 
        : (customer?.fullName || customer?.name || 'CONSUMIDOR FINAL');
    const destDoc = customer?.cpfCnpj || customer?.document || '';
    const destLogr = order.shipping?.address?.street || customer?.address?.street || '';
    const destNum = order.shipping?.address?.number || customer?.address?.number || 'S/N';
    const destBairro = order.shipping?.address?.neighborhood || customer?.address?.neighborhood || '';
    const destCep = order.shipping?.address?.cep || customer?.address?.cep || '';
    const destMun = order.shipping?.address?.city || customer?.address?.city || 'Colombo';
    const destUF = order.shipping?.address?.state || customer?.address?.state || 'PR';
    const destPhone = customer?.phone || '';
    const destIE = (customer as any)?.rgIe || 'ISENTO';

    const totalOrder = Number(order.paymentsSummary?.totalOrderValue || 0);
    const freight = Number(order.shipping?.fee || 0);
    const discount = Number(order.itemsSummary?.totalFixedDiscount || 0);
    const totalProd = Math.max(0, totalOrder - freight + discount);

    const nowIso = new Date().toISOString();
    const dtEmi = formatToBRDate(nowIso);
    const dtSaida = formatToBRDate(nowIso);
    const hrSaida = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const styles = getDanfeOfficialStyles(isHomologacao);
    const headerHtml = buildDanfeHeaderOfficialHtml({
        settings,
        nfeNumber,
        series,
        formattedKey,
        protocolNumber,
        protocolDate,
        natOp: data.natOp || 'VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS'
    });
    const itemsTableHtml = buildDanfeItemsOfficialHtml(order, settings);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${docTitle} - Nº ${nfeNumber}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="no-print" style="width: 210mm; margin: 0 auto 8px; display: flex; justify-content: space-between; align-items: center;">
        <button onclick="window.print()" style="background: #1e293b; color: #fff; border: 1px solid #000; padding: 6px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">
            🖨️ Imprimir DANFE A4
        </button>
        <span style="font-size: 11px; font-weight: bold; color: #475569;">
            ${isHomologacao ? '⚠️ AMBIENTE DE HOMOLOGAÇÃO (TESTES)' : 'PRODUÇÃO'}
        </span>
    </div>

    <div class="danfe-a4">
        <div class="watermark-homologacao">
            ⚠️ NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ⚠️
        </div>

        <!-- BLOCO 1 & 2: CANHOTO + EMITENTE + CHAVE + PROTOCOLO -->
        ${headerHtml}

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
                    <div class="box-value text-right">${formatCurrency(totalProd).replace('R$', '').trim()}</div>
                </td>
            </tr>
            <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO FRETE</div>
                    <div class="box-value text-right">${formatCurrency(freight).replace('R$', '').trim()}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">VALOR DO SEGURO</div>
                    <div class="box-value text-right">0,00</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">DESCONTO</div>
                    <div class="box-value text-right">${formatCurrency(discount).replace('R$', '').trim()}</div>
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
                    <div class="box-value">${order.shipping?.deliveryMethod === 'pickup' ? 'RETIRADA PELO DESTINATÁRIO' : 'O PRÓPRIO EMITENTE'}</div>
                </td>
                <td style="width: 20%; border: 1px solid #000; padding: 1px 3px;">
                    <div class="box-title">FRETE POR CONTA</div>
                    <div class="box-value">${order.shipping?.deliveryMethod === 'pickup' ? '9-Sem Ocorrência de Transporte' : '0-Emitente (CIF)'}</div>
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
                    <div class="box-value text-right">${order.items?.length || 1}</div>
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

        <!-- BLOCO 7: DADOS DO PRODUTO / SERVIÇOS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
            <tr>
                <td style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    DADOS DOS PRODUTOS / SERVIÇOS
                </td>
            </tr>
        </table>
        ${itemsTableHtml}

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
                    Referente ao Pedido de Venda #${order.orderIndex || order.id}.<br>
                    ${order.observation ? `Observações do Pedido: ${order.observation}` : ''}
                </td>
                <td style="width: 30%; border: 1px solid #000; padding: 4px; font-size: 7.5px; vertical-align: top;">
                    &nbsp;
                </td>
            </tr>
        </table>
    </div>
</body>
</html>`;
}

/**
 * Abre o DANFE em uma nova janela para impressão/visualização imediata
 */
export function openDanfePrintWindow(data: DanfeData): void {
    const html = generateDanfeHtml(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
