import Purchase from '../../../../types/purchase.type';
import { formatCurrency, formatToBRDate } from '../../../../utils/formatters';

export function printPurchaseDocument(purchase: Purchase): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const content = `
    <!DOCTYPE html>
    <html>
        <head>
            <meta charset="utf-8" />
            <title>Pedido de Compra #${purchase.purchaseNumber || purchase.id?.slice(-4)}</title>
            <style>
                body { font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; margin: 0; }
                .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
                h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; }
                .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 13px; }
                .meta-item { background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; }
                .meta-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                .meta-value { font-size: 14px; font-weight: 700; color: #1e293b; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #cbd5e1; }
                td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .total-card { margin-top: 24px; padding: 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; text-align: right; font-size: 16px; font-weight: 900; color: #1e40af; }
                @media print { body { padding: 15px; } .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <h1>Pedido de Compra</h1>
                    <div style="font-size: 12px; font-weight: 700; color: #64748b;">MÓVEIS MORANTE HUB • CÓDIGO: #${purchase.id?.slice(-6).toUpperCase()}</div>
                </div>
                <div style="text-align: right; font-size: 12px; color: #64748b;">
                    <div>Data: <strong>${formatToBRDate(purchase.date)}</strong></div>
                    <div>Status: <strong>${purchase.status.toUpperCase()}</strong></div>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <div class="meta-label">Fornecedor</div>
                    <div class="meta-value">${purchase.supplierName}</div>
                </div>
                <div class="meta-item">
                    <div class="meta-label">Nota Fiscal / Chave</div>
                    <div class="meta-value">${purchase.invoiceNumber || 'Não informada'}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Produto</th>
                        <th class="text-center">Qtd. Pedida</th>
                        <th class="text-center">Qtd. Recebida</th>
                        <th class="text-right">Custo Unitário</th>
                        <th class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${purchase.items
                      .map(
                        (item) => `
                        <tr>
                            <td><strong>${item.description}</strong></td>
                            <td class="text-center">${item.quantity} un</td>
                            <td class="text-center">${item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '-'}</td>
                            <td class="text-right">${formatCurrency(item.unitCost)}</td>
                            <td class="text-right">${formatCurrency(item.totalCost || item.quantity * item.unitCost)}</td>
                        </tr>
                    `
                      )
                      .join('')}
                </tbody>
            </table>

            <div class="total-card">
                VALOR TOTAL DO PEDIDO: ${formatCurrency(purchase.totalValue)}
            </div>
        </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
