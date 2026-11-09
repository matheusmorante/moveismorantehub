import type { QuickSnippet } from '@/pages/App/CustomerSupport/types';

// Modelos fixos orientam a conferência; dados e resultados comerciais exigem uma fonte real.
export const DEFAULT_QUICK_SNIPPETS: QuickSnippet[] = [
  {
    id: 'pix-payment',
    title: 'Orientação de Pagamento via PIX',
    category: 'pagamento',
    shortcut: '/pix',
    content:
      'Olá! Para orientar seu pagamento via PIX, vou conferir as instruções oficiais vinculadas ao seu pedido. Aguarde a confirmação dos dados antes de realizar a transferência.',
  },
  {
    id: 'delivery-status',
    title: 'Status e Previsão de Entrega do Pedido',
    category: 'entrega',
    shortcut: '/entrega',
    content:
      'Olá! Vou consultar a situação do seu pedido e confirmar a previsão de entrega com a equipe de logística.',
  },
  {
    id: 'store-location',
    title: 'Consultar Endereço e Horários da Loja',
    category: 'loja',
    shortcut: '/loja',
    content:
      'Olá! Vou confirmar o endereço da loja e o horário de atendimento para a data da sua visita.',
  },
  {
    id: 'warranty-assistance',
    title: 'Solicitação de Assistência Técnica',
    category: 'assistencia',
    shortcut: '/garantia',
    content:
      'Olá! Para analisar sua solicitação de assistência, informe o número do pedido e descreva o problema. Se puder, envie fotos ou um vídeo do produto. Vamos conferir os próximos passos com a equipe responsável.',
  },
  {
    id: 'welcome-greeting',
    title: 'Saudação Inicial e Boas-Vindas',
    category: 'geral',
    shortcut: '/ola',
    content:
      'Olá! Boas-vindas à Móveis Morante. Como podemos ajudar?',
  },
];
