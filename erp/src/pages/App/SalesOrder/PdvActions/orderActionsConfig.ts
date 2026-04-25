import Order, { OrderAction, IsButtonsClicked } from "../../../types/order.type";
import { assistanceCustomerWhatsappUrl } from "../../../utils/whatsapp";
import { supabase } from "@/pages/utils/supabaseConfig";
import { toast } from "react-toastify";

export const actionsMap: Record<OrderAction, (order: Order) => void> = {
    'PRINT_RECEIPT': (order) => {
        if (!order.seller) {
            toast.error("Vendedor obrigatório para imprimir recibo.");
            return;
        }
        sessionStorage.setItem('order', JSON.stringify(order));
        window.open('/receipt', '_blank');
    },
    'PRINT_SHIPPING_ORDER': (order) => {
        if (!order.seller) {
            toast.error("Vendedor obrigatório para imprimir o pedido.");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsHtml = order.items.map(item => {
            const unitPrice = item.unitPrice || 0;
            const quantity = item.quantity || 0;
            const discount = item.unitDiscount || 0;
            const total = (unitPrice - discount) * quantity;
            
            return `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.description}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Pedido de Venda - ${order.id}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th { background: #f4f4f4; text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
                        .footer { margin-top: 30px; text-align: right; font-weight: bold; font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <img src="/lizandro.png" alt="Seu Lizandro" style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover; border: 1px solid #eee;" />
                            <div>
                                <h1 style="margin: 0; font-size: 24px;">Pedido de Venda</h1>
                                <p style="margin: 2px 0; font-size: 14px; font-weight: bold; color: #666;">ID: ${order.id}</p>
                                <p style="margin: 2px 0; font-size: 14px;">Data: ${order.date}</p>
                            </div>
                        </div>
                        <div style="text-align: right;">
                             <p style="margin: 0; font-weight: bold; font-size: 16px;">Móveis Morante</p>
                             <p style="margin: 5px 0; font-size: 12px; color: #444;">Cliente: ${order.customerData?.fullName || 'Não informado'}</p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Descrição</th>
                                <th style="text-align: center;">Qtd</th>
                                <th style="text-align: right;">V. Unit</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px dashed #ccc;">
                        <h3 style="font-size: 14px; margin-bottom: 10px;">FORMA DE PAGAMENTO</h3>
                        <table style="font-size: 12px;">
                            ${order.payments.map(p => `
                                <tr>
                                    <td>${p.method.toUpperCase()}</td>
                                    <td style="text-align: right;">R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td style="text-align: right; font-style: italic;">(${p.status})</td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                    <div class="footer">
                        Total do Pedido: R$ ${(order.paymentsSummary.totalOrderValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    },
    'PRINT_WARRANTY_TERM': (order) => {
        console.log("Gerando Termo de Garantia para o pedido:", order.id);
    },
    'SEND_SHIPPING_ORDER': (order) => {
        const paymentsInfo = order.payments
            .map((p) => `- ${p.method.toUpperCase()}: R$ ${p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${p.status})`)
            .join("%0A");

        const message = `*Confirmação de Entrega*%0A%0AOlá! Seu pedido de entrega foi registrado.%0A%0A*Itens:*%0A${order.items
            .map((item) => `- ${item.description} (Qtd: ${item.quantity})`)
            .join("%0A")}%0A%0A*Pagamento:*%0A${paymentsInfo}%0A%0A*Total:* R$ ${(order.paymentsSummary.totalOrderValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
            }%0A%0AObrigado!`;
        window.open(`https://wa.me/?text=${message}`, "_blank");
    },
    'SEND_CUSTOMER_ORDER': (order) => {
        const message = `*Detalhes do Pedido*%0A%0AOlá! Aqui estão os detalhes do seu pedido.%0A%0A*Total:* ${order.paymentsSummary.totalOrderValue || 0
            }%0A%0AStatus: Em Preparação.`;
        window.open(`https://wa.me/?text=${message}`, "_blank");
    },
    'SEND_ASSISTANCE_CUSTOMER': (order) => {
        window.open(assistanceCustomerWhatsappUrl(order), "_blank");
    },
    'SEND_CUSTOMER_REVIEWS': (order) => {
        const message = `*Avaliação do Pedido*%0A%0AOlá! Poderia nos avaliar?`;
        window.open(`https://wa.me/?text=${message}`, "_blank");
    },
    'STOCK_WITHDRAWAL': () => {
        // Handled in UI
    },
    'STOCK_REVERSAL': () => {
        // Handled in UI
    },
    'PRINT_SHIPPING_LABEL': () => {
        console.log("Printing shipping label...");
    },
    'PRINT_PRODUCT_LABEL': () => {
        console.log("Printing product label...");
    },
    'GENERATE_PAYMENT_LINK': async (order) => {
        toast.info("Gerando Link de Pagamento da Rede...");
        try {
            const { data, error } = await supabase.functions.invoke('rede-gateway', {
                body: { 
                    action: 'create-payment-link', 
                    payload: {
                        amount: Math.round((order.paymentsSummary.totalOrderValue || 0) * 100),
                        reference: order.id,
                        orderId: order.id,
                        softDescriptor: "LOJA_PDV"
                    } 
                }
            });

            if (error || !data || data.error) {
                console.error("Erro gerando link:", error, data);
                toast.error("Erro ao gerar link de pagamento.");
                return;
            }

            const url = data.url || (data.links && data.links.find((l: any) => l.rel === 'payment')?.href) || data.id;
            
            if (url) {
                // If it's a valid URL, offer to open or copy. Since it's quick, standard behavior is copying or sending.
                // For now, let's copy to clipboard and open whatsapp
                const isUrl = url.startsWith("http");
                const link = isUrl ? url : `https://pagamento.rede.com.br/link/${url}`;
                
                await navigator.clipboard.writeText(link);
                toast.success("Link gerado e copiado para a área de transferência!");
                
                const customerPhone = order.customerData?.phone;
                if (customerPhone) {
                    const message = `*Pagamento do Pedido* %0A%0AOlá! Segue o link para pagamento do seu pedido seguro via Rede Itaú: %0A${link} %0A%0AValor: R$ ${(order.paymentsSummary.totalOrderValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                    window.open(`https://wa.me/55${customerPhone.replace(/\D/g, '')}?text=${message}`, "_blank");
                }
            } else {
                toast.error("Retorno inesperado da API Rede.");
            }

        } catch (err) {
            console.error("Exceção:", err);
            toast.error("Falha de conexão com o Gateway Rede.");
        }
    },
    'PRINT_ASSISTANCE_OS': (order) => {
        if (!order.seller) {
            toast.error("Vendedor obrigatório para imprimir a OS.");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const assistanceItemsHtml = (order.assistanceItems || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.handlingType || 'N/A'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.originalOrderId || '-'}</td>
            </tr>
        `).join('');

        const extraItemsHtml = (order.items || []).map(item => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R$ ${(item.quantity * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>ORDEM DE SERVIÇO - ${order.id}</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 20px; color: #1e293b; line-height: 1.5; }
                        .ticket { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; }
                        .header { display: flex; justify-content: space-between; align-items: start; border-bottom: 8px solid #f97316; padding-bottom: 16px; margin-bottom: 16px; }
                        h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.025em; }
                        .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
                        .info-box { background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; }
                        .label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
                        .value { font-size: 13px; font-weight: 700; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-block: 12px; }
                        th { text-align: left; font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; padding: 8px; border-bottom: 1px solid #e2e8f0; }
                        .section-title { font-size: 10px; font-weight: 900; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.1em; border-left: 3px solid #3b82f6; padding-left: 8px; margin-top: 20px; }
                        .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: end; }
                        .signature { border-top: 1px solid #cbd5e1; width: 250px; text-align: center; padding-top: 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
                        @media print { body { padding: 0; } .ticket { border: none; max-width: 100%; } }
                    </style>
                </head>
                <body>
                    <div class="ticket">
                        <div class="header" style="background: #ea580c; color: white; padding: 20px; border-radius: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: none; margin-bottom: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                            <div style="display: flex; gap: 15px; align-items: center;">
                                <img src="/lizandro.png" style="width: 60px; height: 60px; border-radius: 12px; border: 3px solid rgba(255,255,255,0.2);" />
                                <div>
                                    <h1 style="color: white; margin: 0; font-size: 22px; letter-spacing: -0.025em;">Ordem de Serviço</h1>
                                    <div style="color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 700; margin-top: 2px;">ASSISTÊNCIA TÉCNICA • #${order.id}</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: rgba(255,255,255,0.8); letter-spacing: 0.05em;">Data de Emissão</div>
                                <div style="font-size: 14px; font-weight: 800;">${new Date(order.date).toLocaleDateString('pt-BR')}</div>
                            </div>
                        </div>

                        <div class="info-grid">
                            <div class="info-box">
                                <div class="label">Cliente</div>
                                <div class="value">${order.customerData?.fullName || 'Não informado'}</div>
                                <div class="value" style="font-size: 11px; opacity: 0.7;">${order.customerData?.phone}</div>
                            </div>
                            <div class="info-box">
                                <div class="label">Vendedor / Responsável</div>
                                <div class="value">${order.seller}</div>
                            </div>
                        </div>

                        ${order.assistanceDescription ? `
                            <div class="section-title">Descrição do Problema / Solicitação</div>
                            <div class="info-box" style="margin-top: 8px;">
                                <div class="value" style="white-space: pre-wrap; font-weight: 500;">${order.assistanceDescription}</div>
                            </div>
                        ` : ''}

                        ${order.shipping?.scheduling?.date ? `
                            <div class="section-title">Agendamento</div>
                            <div class="info-box" style="margin-top: 8px; display: flex; gap: 24px;">
                                <div>
                                    <div class="label">Data Prevista</div>
                                    <div class="value">${new Date(order.shipping.scheduling.date).toLocaleDateString('pt-BR')}</div>
                                </div>
                                ${order.shipping.scheduling.startTime ? `
                                <div>
                                    <div class="label">Horário</div>
                                    <div class="value">${order.shipping.scheduling.startTime}</div>
                                </div>
                                ` : ''}
                            </div>
                        ` : ''}

                        ${order.assistanceItems?.length ? `
                            <div class="section-title">Produtos para Assistência</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th style="text-align: center;">Qtd</th>
                                        <th style="text-align: center;">Tratativa</th>
                                        <th style="text-align: center;">Origem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${assistanceItemsHtml}
                                </tbody>
                            </table>
                        ` : ''}

                        ${order.items?.length ? `
                            <div class="section-title">Peças / Itens Adicionais</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Item</th>
                                        <th style="text-align: center;">Qtd</th>
                                        <th style="text-align: right;">Unit..</th>
                                        <th style="text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${extraItemsHtml}
                                </tbody>
                            </table>
                        ` : ''}

                        <div class="footer">
                            <div class="signature">Assinatura do Técnico</div>
                            <div style="text-align: right;">
                                ${order.assistanceServiceValue ? `
                                    <div class="label">Valor do Serviço</div>
                                    <div class="value" style="font-size: 18px; color: #3b82f6;">R$ ${order.assistanceServiceValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${order.observation ? `
                            <div style="margin-top: 24px; font-size: 9px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 8px;">
                                <strong>OBSERVAÇÕES:</strong> ${order.observation}
                            </div>
                        ` : ''}
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
};

export interface OrderButton {
    key: keyof IsButtonsClicked;
    icon: string;
    action: OrderAction;
    label: string | ((order: Order) => string);
    color: string;
    orderTypes?: string[];
}

export const buttons: OrderButton[] = [
    {
        key: "printShippingOrder",
        icon: "bi-printer-fill",
        action: "PRINT_SHIPPING_ORDER",
        label: "Imprimir Pedido",
        color: "bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    },
    {
        key: "sendShippingOrder",
        icon: "bi-truck",
        action: "SEND_SHIPPING_ORDER",
        label: (order) => order.shipping?.deliveryMethod === 'pickup' ? "Enviar Retirada para a equipe" : "Enviar Entrega para a equipe",
        color: "bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    },
    {
        key: "sendCustomerOrder",
        icon: "bi-whatsapp",
        action: "SEND_CUSTOMER_ORDER",
        label: (order) => order.shipping?.deliveryMethod === 'pickup' ? "Enviar retirada para o cliente" : "Enviar entrega para o cliente",
        color: "bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    },
    {
        key: "sendCustomerOrder",
        icon: "bi-whatsapp",
        action: "SEND_ASSISTANCE_CUSTOMER",
        label: "Confirmar Assistência",
        color: "bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['assistance']
    },
    {
        key: "printAssistanceOS",
        icon: "bi-printer-fill",
        action: "PRINT_ASSISTANCE_OS",
        label: "Imprimir OS",
        color: "bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['assistance']
    },
    {
        key: "generatePaymentLink",
        icon: "bi-link-45deg",
        action: "GENERATE_PAYMENT_LINK",
        label: "Link Rede",
        color: "bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    }
];

