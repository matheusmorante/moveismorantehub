import type Order from '@/pages/types/order.type';
import { formatOrderCode } from '@/pages/utils/orderCode';
import { getSettings } from '@/pages/utils/settingsService';

/**
 * Renderiza e imprime o documento oficial de Ordem de Serviço (Assistência Técnica).
 */
export const printAssistanceServiceOrder = (order: Order): void => {
  sessionStorage.setItem('order', JSON.stringify(order));

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const settings = getSettings();
  const allHandlingOptions = [
    ...(settings.deliveryHandlingOptions || []),
    ...(settings.pickupHandlingOptions || []),
  ];

  const assistanceItemsHtml = (order.assistanceItems || [])
    .map(
      (item) => `
          <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 700;">${item.description}${item.observation?.trim() ? ` - ${item.observation.trim()}` : ''}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 700;">${item.quantity}</td>
          </tr>
      `
    )
    .join('');

  const extraItemsHtml = (order.items || [])
    .map((item) => {
      const opt = allHandlingOptions.find((o) => o.label === (item.handlingType || '').trim());
      const bgColor = opt?.color ? `${opt.color}20` : 'transparent';
      const textColor = opt?.color || '#64748b';

      return `
              <tr>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: 700;">${item.description}${item.observation?.trim() ? ` - ${item.observation.trim()}` : ''}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 700; background-color: ${bgColor}; color: ${textColor}; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10px;">${item.handlingType || '-'}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 700;">${item.quantity}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 700;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
          `;
    })
    .join('');

  printWindow.document.write(`
          <html>
              <head>
                  <title>ORDEM DE SERVIÇO - ${formatOrderCode(order)}</title>
                  <style>
                      body { font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5; }
                      .ticket { max-width: 800px; margin: 0 auto; border: 2px solid #eee; padding: 30px; border-radius: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-block: 20px; }
                      th { text-align: left; font-size: 10px; font-weight: 900; text-transform: uppercase; background: #f8fafc; padding: 12px; color: #475569; border-bottom: 2px solid #e2e8f0; }
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
                          <div class="label" style="color: #c2410c;">Agendamento Técnico</div>
                          <div style="display: flex; gap: 30px; align-items: center;">
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
                          </div>
                      </div>
                      
                      <div style="margin-bottom: 25px; padding: 20px; border: 2px solid #e2e8f0; border-radius: 15px; background: #fff;">
                          <div class="label">Descrição do Problema / Solicitação</div>
                          <div style="font-size: 14px; color: #334155; font-weight: 500; white-space: pre-wrap;">${order.assistanceDescription || 'Nenhuma descrição informada.'}</div>
                      </div>

                      ${
                        order.assistanceItems?.length
                          ? `
                          <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; border-left: 4px solid #ea580c; padding-left: 10px; margin-bottom: 10px;">Itens para Assistência</h3>
                          <table>
                              <thead><tr><th style="width: 80%;">Produto</th><th style="text-align: center;">Qtd</th></tr></thead>
                              <tbody>${assistanceItemsHtml}</tbody>
                          </table>
                      `
                          : ''
                      }

                      ${
                        order.items?.length
                          ? `
                          <h3 style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1e293b; border-left: 4px solid #ea580c; padding-left: 10px; margin-top: 20px; margin-bottom: 10px;">Peças e Materiais Extras</h3>
                          <table>
                              <thead><tr><th style="width: 50%;">Item</th><th style="text-align: center;">Manuseio</th><th style="text-align: center;">Qtd</th><th style="text-align: right;">Preço</th></tr></thead>
                              <tbody>${extraItemsHtml}</tbody>
                          </table>
                      `
                          : ''
                      }

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
