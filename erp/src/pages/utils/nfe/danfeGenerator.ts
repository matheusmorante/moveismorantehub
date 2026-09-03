import Order from "@/pages/types/order.type";
import { AppSettings } from "../settingsService";
import { formatCurrency, formatToBRDate } from "../formatters";
import { formatAccessKey } from "./nfeAccessKey";
import { getDanfeStyles } from "./danfe/danfeStyles";
import { buildDanfeHeaderHtml } from "./danfe/danfeHeader";
import { buildDanfeItemsHtml } from "./danfe/danfeItemsTable";

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
}

/**
 * Gera o documento HTML do DANFE oficial pronto para visualização e impressão
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
    const destDoc = customer?.cpfCnpj || customer?.document || 'NÃO INFORMADO';
    const destAddr = order.shipping?.address 
        ? `${order.shipping.address.street || ''}, ${order.shipping.address.number || ''} - ${order.shipping.address.neighborhood || ''}, ${order.shipping.address.city || ''} - ${order.shipping.address.state || ''}`
        : 'Retirada no Balcão';

    const totalOrder = order.paymentsSummary?.totalOrderValue || 0;
    const freight = order.shipping?.fee || 0;

    const styles = getDanfeStyles(isHomologacao);
    const headerHtml = buildDanfeHeaderHtml({
        settings,
        nfeNumber,
        series,
        formattedKey,
        protocolNumber,
        protocolDate
    });
    const itemsTableHtml = buildDanfeItemsHtml(order, settings);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${docTitle} - #${nfeNumber}</title>
    <style>${styles}</style>
</head>
<body>
    <div class="no-print" style="max-width: 800px; margin: 0 auto 12px; display: flex; justify-content: space-between; align-items: center;">
        <button onclick="window.print()" style="background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer;">
            🖨️ Imprimir DANFE
        </button>
        <span style="font-size: 11px; color: #64748b; font-weight: bold;">
            Ambiente: ${isHomologacao ? 'HOMOLOGAÇÃO (TESTES)' : 'PRODUÇÃO'}
        </span>
    </div>

    <div class="danfe-container">
        <div class="watermark">
            ⚠️ NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL ⚠️
        </div>

        ${headerHtml}

        <!-- Destinatário -->
        <div class="section-title">Destinatário / Remetente</div>
        <div class="data-box">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span><strong>Nome / Razão Social:</strong> ${destName}</span>
                <span><strong>CPF/CNPJ:</strong> ${destDoc}</span>
                <span><strong>Data Emissão:</strong> ${formatToBRDate(new Date().toISOString())}</span>
            </div>
            <div>
                <strong>Endereço:</strong> ${destAddr}
            </div>
        </div>

        <!-- Totais -->
        <div class="section-title">Cálculo do Imposto</div>
        <div class="data-box" style="display:flex; justify-content:space-between; text-align:center;">
            <div><span style="font-size:8px; color:#64748b;">BASE CÁLC. ICMS</span><br><strong>R$ 0,00</strong></div>
            <div><span style="font-size:8px; color:#64748b;">VALOR DO ICMS</span><br><strong>R$ 0,00</strong></div>
            <div><span style="font-size:8px; color:#64748b;">VALOR DO FRETE</span><br><strong>${formatCurrency(freight)}</strong></div>
            <div><span style="font-size:8px; color:#64748b;">VALOR TOTAL DOS PRODUTOS</span><br><strong>${formatCurrency(totalOrder - freight)}</strong></div>
            <div><span style="font-size:8px; color:#64748b;">VALOR TOTAL DA NOTA</span><br><strong style="font-size:12px; color:#2563eb;">${formatCurrency(totalOrder)}</strong></div>
        </div>

        <!-- Itens -->
        <div class="section-title">Dados dos Produtos / Serviços</div>
        ${itemsTableHtml}

        <!-- Dados Adicionais -->
        <div class="section-title">Dados Adicionais</div>
        <div class="data-box" style="min-height: 40px; font-size: 9px; line-height: 1.4;">
            <strong>Informações Complementares:</strong><br>
            DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI/ICMS.<br>
            Referente ao Pedido #${order.orderIndex || order.id}.
        </div>
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
