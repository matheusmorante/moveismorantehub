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
    }
};

export interface OrderButton {
    key: keyof IsButtonsClicked;
    icon: string;
    action: OrderAction;
    label: string;
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
        label: "Enviar Entrega",
        color: "bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    },
    {
        key: "sendCustomerOrder",
        icon: "bi-whatsapp",
        action: "SEND_CUSTOMER_ORDER",
        label: "WhatsApp Cliente",
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
        key: "generatePaymentLink",
        icon: "bi-link-45deg",
        action: "GENERATE_PAYMENT_LINK",
        label: "Link Rede",
        color: "bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-200 transition-all font-bold text-xs uppercase tracking-widest px-6 py-3",
        orderTypes: ['sale']
    }
];

