import Purchase from '../../../../types/purchase.type';
import { formatToBRDate } from '../../../../utils/formatters';

/**
 * Abre janela de impressão formatada para o relatório de 3-Way Match de conferência de compra.
 */
export function printPurchaseReceiptReport(
  purchase: Purchase,
  invoiceNumber: string,
  scannedItems: Record<string, number>,
  invoicedQuantities: Record<string, number>
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <html>
      <head>
        <title>Conferência de Compra - ${purchase.supplierName}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; }
          .header { margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
          h1 { margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.025em; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 15px; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 30px; }
          th { background: #f8fafc; text-align: left; padding: 12px 15px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 2px solid #e2e8f0; }
          td { padding: 12px 15px; font-size: 13px; border-bottom: 1px solid #f1f5f9; font-weight: 600; }
          .divergent { color: #f59e0b; }
          .footer { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .sig-line { border-top: 1px solid #cbd5e1; margin-top: 40px; padding-top: 10px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8; text-align: center; }
          @media print { body { padding: 20px; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Conferência de Compra (3-Way Match)</h1>
          <div class="meta">
            <div>Fornecedor: ${purchase.supplierName}</div>
            <div>Pedido: #${purchase.id?.slice(-6).toUpperCase()}</div>
            <div>Data do Pedido: ${formatToBRDate(purchase.date)}</div>
            <div>NF: ${invoiceNumber || 'NÃO INFORMADA'}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produto / Descrição</th>
              <th style="text-align: center">Comprado</th>
              <th style="text-align: center">Faturado (NF)</th>
              <th style="text-align: center">Recebido (Físico)</th>
              <th style="text-align: center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchase.items
              .map((item) => {
                const key = item.productId + (item.variationId || '');
                const received = scannedItems[key] || 0;
                const invoiced = invoicedQuantities[key] || 0;
                const isDivergent =
                  received !== item.quantity || received !== invoiced;
                return `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: center">${item.quantity}</td>
                    <td style="text-align: center">${invoiced}</td>
                    <td style="text-align: center">${received}</td>
                    <td style="text-align: center; color: ${isDivergent ? '#f59e0b' : '#10b981'}">
                      ${isDivergent ? 'DIVERGENTE' : 'OK'}
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
        <div class="footer">
          <div class="sig-line">Responsável pela Conferência</div>
          <div class="sig-line">Data e Hora do Recebimento</div>
        </div>
        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
}
