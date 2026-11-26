import type Order from '@/pages/types/order.type';
import { formatOrderCode } from '@/pages/utils/orderCode';

const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });

/**
 * Renderiza e imprime o documento oficial de Ordem de Serviço (Assistência Técnica).
 */
export const printAssistanceServiceOrder = (order: Order): void => {
  sessionStorage.setItem('order', JSON.stringify(order));

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const assistanceItemsHtml = order.assistanceItems?.length
    ? order.assistanceItems
        .map(
          (item) => `
            <div style="padding: 6px 0; font-size: 12px; font-weight: 800; color: #1e293b;">
              ${escapeHtml(item.description)}
              <span style="font-size: 10px; color: #64748b;"> · Qtd.: ${item.quantity}</span>
              ${item.observation?.trim() ? `<div style="font-size: 10px; font-weight: 600; color: #64748b;">${escapeHtml(item.observation.trim())}</div>` : ''}
            </div>
          `
        )
        .join('')
    : '<div style="font-size: 11px; color: #64748b;">Item não informado.</div>';

  printWindow.document.write(`
          <html>
              <head>
                  <title>ORDEM DE SERVIÇO - ${formatOrderCode(order)}</title>
                  <style>
                      body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                      .ticket { max-width: 800px; margin: 0 auto; border: 2px solid #eee; padding: 30px; border-radius: 20px; }
                      .info-box { background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; }
                      .label { font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
                      .value { font-size: 13px; font-weight: 800; color: #1e293b; }
                  </style>
              </head>
              <body>
                  <div class="ticket">
                      <div class="header" style="background: #ea580c; color: white; padding: 30px; border-radius: 15px; display: flex; justify-content: space-between; align-items: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin-bottom: 25px;">
                          <div style="display: flex; gap: 20px; align-items: center;">
                              <img src="/lizandro.png" style="width: 90px; height: 90px; border-radius: 15px; border: 3px solid rgba(255,255,255,0.3);" />
                              <div>
                                  <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">Ordem de Serviço</h1>
                                  <div style="color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 800;">ASSISTÊNCIA #${formatOrderCode(order)}</div>
                              </div>
                          </div>
                          <div style="text-align: right;">
                              <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; opacity: 0.8;">Data Emissão</div>
                              <div style="font-size: 15px; font-weight: 900;">${new Date(order.date).toLocaleDateString('pt-BR')}</div>
                          </div>
                      </div>

                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                          <div class="info-box">
                              <div class="label">Cliente</div>
                              <div class="value">${order.customerData?.fullName || 'Não informado'}</div>
                              <div style="font-size: 12px; font-weight: 600; color: #ea580c; margin-top: 2px;">${order.customerData?.phone || 'Sem telefone'}</div>
                          </div>
                          <div class="info-box">
                              <div class="label">Vendedor / Atendente</div>
                              <div class="value">${order.seller || 'Não informado'}</div>
                          </div>
                      </div>

                      <div class="info-box" style="margin-bottom: 20px;">
                          <div class="label">Endereço de Assistência</div>
                          <div class="value">
                              ${
                                order.customerData?.fullAddress
                                  ? `
                                  ${order.customerData.fullAddress.street}, ${order.customerData.fullAddress.number}
                                  ${order.customerData.fullAddress.complement ? ` - ${order.customerData.fullAddress.complement}` : ''}<br>
                                  ${order.customerData.fullAddress.neighborhood} - ${order.customerData.fullAddress.city}/${order.customerData.fullAddress.state || ''}<br>
                                  CEP: ${order.customerData.fullAddress.cep || ''}
                                  ${order.customerData.fullAddress.observation ? `<br><div style="margin-top: 5px; font-size: 11px; color: #64748b;"><strong>Obs:</strong> ${order.customerData.fullAddress.observation}</div>` : ''}
                              `
                                  : 'Endereço não informado'
                              }
                          </div>
                      </div>
                      
                      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 12px;">
                          <div class="label" style="color: #c2410c;">Logística da Assistência</div>
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px 30px; align-items: start;">
                              <div>
                                  <span style="font-size: 10px; font-weight: 700; color: #9a3412;">Data:</span> 
                                  <span style="font-size: 15px; font-weight: 900; color: #7c2d12;">
                                      ${
                                        order.shipping?.scheduling?.dateType === 'range' &&
                                        order.shipping?.scheduling?.endDate
                                          ? `${new Date(order.shipping.scheduling.date).toLocaleDateString('pt-BR')} até ${new Date(order.shipping.scheduling.endDate).toLocaleDateString('pt-BR')}`
                                          : order.shipping?.scheduling?.date
                                            ? new Date(
                                                order.shipping.scheduling.date
                                              ).toLocaleDateString('pt-BR')
                                            : 'A combinar'
                                      }
                                  </span>
                              </div>
                              <div>
                                  <span style="font-size: 10px; font-weight: 700; color: #9a3412;">Horário:</span> 
                                  <span style="font-size: 15px; font-weight: 900; color: #7c2d12;">
                                      ${
                                        order.shipping?.scheduling?.type === 'range' &&
                                        order.shipping?.scheduling?.startTime &&
                                        order.shipping?.scheduling?.endTime
                                          ? `${order.shipping.scheduling.startTime} às ${order.shipping.scheduling.endTime}`
                                          : order.shipping?.scheduling?.startTime ||
                                            order.shipping?.scheduling?.time ||
                                            'A combinar'
                                      }
                                  </span>
                              </div>
                              <div style="grid-column: 1 / -1; border-top: 1px solid #fed7aa; padding-top: 10px;">
                                  <div class="label" style="color: #c2410c;">Item da Assistência</div>
                                  ${assistanceItemsHtml}
                              </div>
                          </div>
                      </div>
                      
                      <div style="margin-bottom: 25px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 15px; background: #fff;">
                          <div class="label">Descrição do Problema / Solicitação</div>
                          <div style="font-size: 14px; color: #334155; font-weight: 500; white-space: pre-wrap;">${order.assistanceDescription || 'Nenhuma descrição informada.'}</div>
                      </div>

                      <div style="margin-top: 30px; border-top: 2px dashed #e2e8f0; padding-top: 20px; text-align: right;">
                          <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #64748b; margin-right: 10px;">Total do Serviço:</span>
                          <span style="font-size: 24px; font-weight: 900; color: #ea580c;">R$ ${(order.assistanceServiceValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                  </div>
                  <script>window.onload = function() { window.print(); window.close(); };</script>
              </body>
          </html>
      `);
  printWindow.document.close();
};
