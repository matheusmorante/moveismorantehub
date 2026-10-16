import type Order from '@/pages/types/order.type';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { stringifyFullAddressWithObservation } from '@/pages/utils/formatters';

/**
 * Renderiza e imprime o documento oficial de Ordem de Coleta / Comprovante de Devolução.
 */
export const printReturnServiceOrder = (order: Order): void => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatCurrency = (value: unknown) =>
    Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const isCollection =
    order.returnMethod === 'store_collection' ||
    (order.returnMethod == null && order.status === 'scheduled');
  const returnDocumentTitle = isCollection
    ? 'OS DE COLETA (DEVOLUÇÃO)'
    : 'COMPROVANTE DE DEVOLUÇÃO';
  const collectionDate = order.shipping?.scheduling?.date
    ? new Date(`${order.shipping.scheduling.date}T12:00:00`).toLocaleDateString('pt-BR')
    : 'A definir';
  const originalOrderCode = order.linkedOrderCode || 'N/A';
  const returnTotal = (order.items || []).reduce(
    (total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );
  const scheduling = order.shipping?.scheduling;
  const isTimeRange = scheduling?.type === 'range';
  const collectionTime = isTimeRange
    ? `${scheduling?.startTime || ''}${scheduling?.endTime ? ` às ${scheduling.endTime}` : ''}`.trim() ||
      scheduling?.time ||
      'A definir'
    : scheduling?.startTime || scheduling?.time || 'A definir';
  const collectionAddress =
    stringifyFullAddressWithObservation(
      order.shipping?.deliveryAddress || order.customerData?.fullAddress
    ) || 'Endereço não informado';
  const distance = order.shipping?.distance ? `${order.shipping.distance} km` : 'Não informada';
  const estimatedTime = order.shipping?.durationMinutes
    ? `${order.shipping.durationMinutes} min`
    : 'Não informado';

  const itemsHtml = (order.items || [])
    .map(
      (item) => `
          <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">
                  <div style="font-weight: 900; font-size: 12px; text-transform: uppercase;">${item.description}${item.observation?.trim() ? ` - ${item.observation.trim()}` : ''}</div>
              </td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 700;">${item.quantity}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">R$ ${formatCurrency(Number(item.quantity || 0) * Number(item.unitPrice || 0))}</td>
          </tr>
      `
    )
    .join('');

  printWindow.document.write(`
          <html>
              <head>
                  <title>${returnDocumentTitle} - ${formatOrderCode(order)}</title>
                  <style>
                      body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                      .ticket { max-width: 800px; margin: 0 auto; border: 2px solid #eee; padding: 30px; border-radius: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-block: 20px; }
                      th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #fdfaf1; padding: 12px; color: #92400e; }
                      .footer { margin-top: 40px; padding-top: 20px; border-top: 2px dashed #eee; font-size: 11px; color: #666; text-align: center; }
                  </style>
              </head>
              <body>
                  <div class="ticket">
                      <div class="header" style="background: #d97706; color: white; padding: 30px; border-radius: 15px; display: flex; align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-bottom: 30px;">
                          <div style="display: flex; gap: 20px; align-items: center;">
                              <div style="width: 256px; height: 256px; flex: 0 0 256px; display: flex; align-items: center; justify-content: center; border-radius: 24px; background: white; padding: 12px; box-sizing: border-box;">
                                  <img src="/images/logo-morante.svg" style="width: 100%; height: 100%; object-fit: contain; border-radius: 18px;" />
                              </div>
                              <div>
                                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">${isCollection ? 'OS de Coleta (Devolução)' : 'Comprovante de Devolução'}</h1>
                                  <div style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 800;">PEDIDO: #${formatOrderCode(order)}</div>
                              </div>
                          </div>
                      </div>

                      ${isCollection ? `<div style="margin-bottom: 30px; padding: 18px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 12px;">
                          <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #9a3412; margin-bottom: 12px;">Agendamento da Coleta</div>
                          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 24px;">
                              <div><div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b45309;">Data</div><div style="font-size: 14px; font-weight: 800; color: #7c2d12;">${collectionDate}</div></div>
                              <div><div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b45309;">${isTimeRange ? 'Período' : 'Horário fixo'}</div><div style="font-size: 14px; font-weight: 800; color: #7c2d12;">${collectionTime}</div></div>
                              <div><div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b45309;">Distância estimada</div><div style="font-size: 14px; font-weight: 800; color: #7c2d12;">${distance}</div></div>
                              <div><div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b45309;">Tempo estimado</div><div style="font-size: 14px; font-weight: 800; color: #7c2d12;">${estimatedTime}</div></div>
                              <div style="grid-column: 1 / -1;"><div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #b45309;">Endereço da coleta</div><div style="font-size: 14px; font-weight: 800; color: #7c2d12;">${collectionAddress}</div></div>
                          </div>
                      </div>` : `<div style="margin-bottom: 30px; padding: 18px; border: 1px solid #a7f3d0; background: #ecfdf5; border-radius: 12px; font-weight: 800;">Retorno recebido na loja. Este documento registra o pedido de devolução.</div>`}

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
                          <div style="padding: 15px; background: #fffcf0; border-radius: 12px;">
                              <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #92400e; margin-bottom: 5px;">Dados do Cliente</div>
                              <div style="font-size: 14px; font-weight: 900;">${order.customerData?.fullName}</div>
                              <div style="font-size: 12px; font-weight: 600; color: #b45309;">${order.customerData?.phone}</div>
                          </div>
                          <div style="padding: 15px; background: #fffcf0; border-radius: 12px; text-align: right;">
                              <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #92400e; margin-bottom: 5px;">Pedido Original</div>
                              <div style="font-size: 14px; font-weight: 900;">#${originalOrderCode}</div>
                              <div style="font-size: 12px; font-weight: 600; color: #b45309;">Vendedor: ${order.seller || 'Não informado'}</div>
                          </div>
                      </div>
                      
                      <div style="margin-bottom: 30px;">
                          <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; border-left: 4px solid #d97706; padding-left: 10px; margin-bottom: 15px;">Itens Devolvidos</h3>
                          <table>
                              <thead>
                                  <tr>
                                      <th>Descrição do Produto</th>
                                      <th style="text-align: center;">Qtd</th>
                                      <th style="text-align: right;">Valor</th>
                                  </tr>
                              </thead>
                              <tbody>${itemsHtml}</tbody>
                              <tfoot>
                                  <tr>
                                      <td colspan="2" style="padding: 15px; text-align: right; font-weight: 900; font-size: 14px; text-transform: uppercase; color: #78350f;">Total da Devolução:</td>
                                      <td style="padding: 15px; text-align: right; font-weight: 900; font-size: 18px; color: #d97706;">R$ ${formatCurrency(returnTotal)}</td>
                                  </tr>
                              </tfoot>
                          </table>
                      </div>

                      ${
                        order.observation
                          ? `
                          <div style="margin-top: 20px; padding: 20px; border-radius: 12px; background: #fffbeb; border: 1px solid #fef3c7;">
                              <strong style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #92400e; display: block; margin-bottom: 8px;">Observações da Devolução:</strong>
                              <div style="font-size: 12px; color: #92400e; font-weight: 500;">${order.observation}</div>
                          </div>
                      `
                          : ''
                      }
                      <div class="footer">
                          <strong>MÓVEIS MORANTE</strong> - Ordem de serviço gerada em ${new Date().toLocaleString('pt-BR')}
                      </div>
                  </div>
                  <script>window.onload = function() { window.print(); window.close(); };</script>
              </body>
          </html>
      `);
  printWindow.document.close();
};
