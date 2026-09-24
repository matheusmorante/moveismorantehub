import { formatToBRDate } from "../formatters";
import { formatAccessKey } from "./nfeAccessKey";
import {
    DanfeData,
    getDanfeOfficialStyles,
    buildDanfeHeaderOfficialHtml,
    buildDanfeRecipientOfficialHtml,
    buildDanfeTaxesAndTotalsOfficialHtml,
    buildDanfeTransportOfficialHtml,
    buildDanfeItemsOfficialHtml,
    buildDanfeAdditionalInfoOfficialHtml,
} from "./danfe";

export type { DanfeData };

/**
 * Gera o documento HTML do DANFE oficial A4 Retrato 100% conforme MOC 7.0 (Anexo II)
 */
export function generateDanfeHtml(data: DanfeData): string {
    const { order, settings, accessKey, nfeNumber, series, protocolNumber, protocolDate, model, environment } = data;
    const isHomologacao = environment === 2;
    const formattedKey = formatAccessKey(accessKey);
    const docTitle = model === '65' ? 'DANFE NFC-e' : 'DANFE NF-e';

    const totalOrder = Number(order.paymentsSummary?.totalOrderValue || 0);
    const freight = Number(order.shipping?.value || 0);
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
        natOp: data.natOp || 'VENDA DE MERCADORIA ADQUIRIDA DE TERCEIROS',
    });
    const recipientHtml = buildDanfeRecipientOfficialHtml({ order, isHomologacao, dtEmi, dtSaida, hrSaida });
    const taxesAndTotalsHtml = buildDanfeTaxesAndTotalsOfficialHtml({ totalOrder, totalProd, freight, discount });
    const transportHtml = buildDanfeTransportOfficialHtml(order);
    const itemsTableHtml = buildDanfeItemsOfficialHtml(order, settings);
    const additionalInfoHtml = buildDanfeAdditionalInfoOfficialHtml(order);

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

        ${headerHtml}
        ${recipientHtml}
        ${taxesAndTotalsHtml}
        ${transportHtml}

        <!-- BLOCO 7: DADOS DO PRODUTO / SERVIÇOS -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
            <tr>
                <td style="background:#e2e8f0; border: 1px solid #000; padding: 1px 3px; font-size: 6.5px; font-weight: 900;">
                    DADOS DOS PRODUTOS / SERVIÇOS
                </td>
            </tr>
        </table>
        ${itemsTableHtml}

        ${additionalInfoHtml}
    </div>
</body>
</html>`;
}

/**
 * Imprime o DANFE diretamente via agente local ou abre em uma nova janela para impressão/visualização.
 */
export function openDanfePrintWindow(data: DanfeData): void {
    import('../printing/printService')
        .then(({ printDanfe }) => {
            printDanfe(data).catch(() => {
                fallbackDanfeWindow(data);
            });
        })
        .catch(() => {
            fallbackDanfeWindow(data);
        });
}

function fallbackDanfeWindow(data: DanfeData): void {
    const html = generateDanfeHtml(data);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}

export * from './danfe';
