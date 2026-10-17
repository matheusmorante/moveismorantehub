import Order, { OrderAction, IsButtonsClicked } from '../../../types/order.type';

export interface OrderButton {
  key: keyof IsButtonsClicked;
  icon: string;
  action: OrderAction;
  label: string | ((order: Order) => string);
  color: string;
  tooltip: string;
  // Optional: which orderTypes this button applies to. If absent = all types.
  orderTypes?: string[];
  isBeta?: boolean;
  adminOnly?: boolean;
}

export const buttons: OrderButton[] = [
  {
    key: 'printShippingOrder',
    icon: 'bi-printer-fill',
    action: 'PRINT_SHIPPING_ORDER',
    label: 'Imprimir Pedido',
    color: 'text-blue-600 hover:bg-blue-50',
    tooltip: 'Imprimir Pedido de Venda',
    orderTypes: ['sale'], // Não aparece para assistência
  },
  {
    key: 'printReceipt',
    icon: 'bi-receipt',
    action: 'PRINT_RECEIPT',
    label: 'Imprimir Recibo',
    color: 'text-slate-600 hover:bg-slate-50',
    tooltip: 'Gerar Recibo do Cliente',
    orderTypes: ['sale'], // Não aparece para assistência
  },
  {
    key: 'issueNfe',
    icon: 'bi-file-earmark-text-fill',
    action: 'ISSUE_NFE',
    label: 'Emissão de NF de saída',
    color: 'text-indigo-600 hover:bg-indigo-50',
    tooltip: 'Emitir NF-e para entrega ou NFC-e para retirada, conforme a operação',
    orderTypes: ['sale', 'showroom'],
  },
  {
    key: 'printWarrantyTerm',
    icon: 'bi-shield-check',
    action: 'PRINT_WARRANTY_TERM',
    label: 'Termo de garantia',
    color: 'text-emerald-700 hover:bg-emerald-50',
    tooltip: 'Visualizar, imprimir ou enviar o Termo de Garantia do pedido',
    orderTypes: ['sale', 'showroom'],
  },
  {
    key: 'sendShippingOrder',
    icon: 'bi-truck',
    action: 'SEND_SHIPPING_ORDER',
    label: (order) =>
      order.shipping?.deliveryMethod === 'pickup'
        ? 'Enviar Retirada para a equipe'
        : 'Enviar Entrega para a equipe',
    color: 'text-orange-500 hover:bg-orange-50',
    tooltip: 'Enviar detalhes da entrega via WhatsApp',
    orderTypes: ['sale'], // Não aparece para assistência
  },
  {
    key: 'sendCustomerOrder',
    icon: 'bi-whatsapp',
    action: 'SEND_CUSTOMER_ORDER',
    label: (order) =>
      order.shipping?.deliveryMethod === 'pickup'
        ? 'Enviar retirada para o cliente'
        : 'Enviar entrega para o cliente',
    color: 'text-green-600 hover:bg-green-50',
    tooltip: 'Enviar confirmação do pedido para o cliente',
    orderTypes: ['sale'],
  },
  {
    key: 'sendCustomerOrderDirectApi',
    icon: 'bi-whatsapp',
    action: 'SEND_CUSTOMER_ORDER_DIRECT_API',
    label: 'Enviar para o cliente diretamente (Cloud WhatsApp)',
    color:
      'text-[#3b1900] bg-amber-400 hover:bg-amber-300 border border-amber-500 shadow-sm dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/40',
    tooltip:
      'Enviar para o cliente diretamente via Cloud WhatsApp API (Beta - apenas Administrador)',
    orderTypes: ['sale'],
    isBeta: true,
    adminOnly: true,
  },
  {
    key: 'sendCustomerOrderDetails', // details message
    icon: 'bi-whatsapp',
    action: 'SEND_ASSISTANCE_ORDER_DETAILS',
    label: 'Enviar assistência para o cliente',
    color: 'text-green-600 hover:bg-green-50',
    tooltip: 'Enviar detalhes completos do pedido de assistência ao cliente',
    orderTypes: ['assistance'],
  },
  {
    key: 'sendCustomerReviews',
    icon: 'bi-star-fill',
    action: 'SEND_CUSTOMER_REVIEWS',
    label: 'Enviar pedido de avaliação',
    color: 'text-yellow-500 hover:bg-yellow-50',
    tooltip: 'Enviar pedido de avaliação da loja no Google Maps',
    orderTypes: ['sale'],
  },
  {
    key: 'generateReturn',
    icon: 'bi-arrow-return-left',
    action: 'GENERATE_RETURN',
    label: 'Gerar Pedido de Devolução',
    color: 'text-amber-600 hover:bg-amber-50',
    tooltip: 'Criar uma devolução baseada neste pedido',
    orderTypes: ['sale', 'showroom'],
  },
  {
    key: 'generateAssistance',
    icon: 'bi-tools',
    action: 'GENERATE_ASSISTANCE',
    label: 'Gerar Assistência',
    color: 'text-orange-600 hover:bg-orange-50',
    tooltip: 'Criar uma assistência técnica vinculada a este pedido atendido',
    orderTypes: ['sale', 'showroom'],
  },
  {
    key: 'undoReturn',
    icon: 'bi-arrow-counterclockwise',
    action: 'UNDO_RETURN',
    label: 'Cancelar Devolução',
    color: 'text-red-600 hover:bg-red-50',
    tooltip: 'Cancela somente esta devolução antes da confirmação do retorno físico',
    orderTypes: ['return'],
  },
  {
    key: 'printReturnOS',
    icon: 'bi-printer-fill',
    action: 'PRINT_RETURN_OS',
    label: (order) =>
      order.returnMethod === 'store_collection'
        ? 'Imprimir OS de Coleta da Devolução'
        : 'Imprimir Comprovante de Devolução',
    color: 'text-amber-700 hover:bg-amber-50',
    tooltip: 'Imprimir documento do pedido de devolução',
    orderTypes: ['return'],
  },
  {
    key: 'sendReturnOSCustomer',
    icon: 'bi-whatsapp',
    action: 'SEND_RETURN_OS_CUSTOMER',
    label: 'Enviar pedido de devolução ao cliente',
    color: 'text-green-600 hover:bg-green-50',
    tooltip: 'Enviar o pedido de devolução ao cliente pelo WhatsApp',
    orderTypes: ['return'],
  },
  {
    key: 'sendReturnOSTeam',
    icon: 'bi-send-fill',
    action: 'SEND_RETURN_OS_TEAM',
    label: 'Enviar dados da coleta da devolução para equipe',
    color: 'text-blue-600 hover:bg-blue-50',
    tooltip: 'Enviar os dados da coleta agendada à equipe pelo WhatsApp',
    orderTypes: ['return'],
  },
  {
    key: 'sendAssistanceOS',
    icon: 'bi-send-fill',
    action: 'SEND_ASSISTANCE_OS',
    label: 'Enviar OS para a equipe',
    color: 'text-blue-600 hover:bg-blue-50',
    tooltip: 'Enviar Ordem de Serviço de assistência para o grupo da equipe',
    orderTypes: ['assistance'],
  },
  {
    key: 'printAssistanceOS',
    icon: 'bi-printer-fill',
    action: 'PRINT_ASSISTANCE_OS',
    label: 'Imprimir OS',
    color: 'text-slate-600 hover:bg-slate-50',
    tooltip: 'Imprimir Ordem de Serviço (PDF)',
    orderTypes: ['assistance'],
  },
  {
    key: 'printBudget',
    icon: 'bi-printer-fill',
    action: 'PRINT_BUDGET',
    label: 'Imprimir Orçamento',
    color: 'text-indigo-600 hover:bg-indigo-50',
    tooltip: 'Imprimir Proposta Comercial (Orçamento)',
    orderTypes: ['budget'],
  },
  {
    key: 'sendBudget',
    icon: 'bi-whatsapp',
    action: 'SEND_BUDGET',
    label: 'Enviar orçamento para o cliente',
    color: 'text-green-600 hover:bg-green-50',
    tooltip: 'Enviar orçamento para o cliente via WhatsApp',
    orderTypes: ['budget'],
  },
  {
    key: 'sendGroupInvite',
    icon: 'bi-people-fill',
    action: 'SEND_GROUP_INVITE',
    label: 'Enviar Convite VIP',
    color: 'text-indigo-600 hover:bg-indigo-50',
    tooltip: 'Enviar convite do grupo VIP para o WhatsApp do cliente',
    orderTypes: ['sale'],
  },
  {
    key: 'duplicateOrder',
    icon: 'bi-files',
    action: 'DUPLICATE_ORDER',
    label: 'Duplicar Pedido',
    color: 'text-emerald-600 hover:bg-emerald-50',
    tooltip: 'Criar uma cópia deste pedido',
    orderTypes: ['sale', 'showroom', 'assistance', 'budget'],
  },
  {
    key: 'generateSaleFromBudget',
    icon: 'bi-cart-check-fill',
    action: 'GENERATE_SALE_FROM_BUDGET',
    label: 'Gerar Pedido de Venda',
    color: 'text-emerald-600 hover:bg-emerald-50',
    tooltip: 'Criar um novo pedido de venda a partir deste orçamento',
    orderTypes: ['budget'],
  },
];
