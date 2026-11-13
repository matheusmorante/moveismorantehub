import type { AiWorkflowConfig } from '../whatsappAiAgentSchemas';

// -------------------------------------------------------------
// Fluxos Configuráveis Padrão de Atendimento
// -------------------------------------------------------------
export const DEFAULT_WORKFLOWS: readonly AiWorkflowConfig[] = [
  {
    id: 'wf_compra',
    workflowKey: 'compra',
    name: 'Fluxo de Compra e Recomendação',
    description: 'Guia o cliente da necessidade à escolha do móvel ideal com fotos e simulação.',
    steps: [
      '1. Identificar ambiente e necessidade do cliente (Sala, Quarto, Cozinha)',
      '2. Buscar produtos no catálogo do ERP e apresentar as melhores opções',
      '3. Detalhar medidas, cores disponíveis e preços à vista e parcelado',
      '4. Informar sobre montagem grátis e prazo de entrega',
      '5. Concluir pedido ou encaminhar para vendedor para fechamento',
    ],
    enabled: true,
    handoffTrigger: false,
  },
  {
    id: 'wf_consulta_produto',
    workflowKey: 'consulta_produto',
    name: 'Fluxo de Consulta Técnica e Catálogo',
    description: 'Responde dúvidas de medidas, materiais e disponibilidade.',
    steps: [
      '1. Identificar modelo ou tipo de produto buscado',
      '2. Consultar estoque e variações em tempo real',
      '3. Apresentar dimensões (L x A x P) e cores disponíveis',
      '4. Enviar imagens ou link do catálogo',
    ],
    enabled: true,
    handoffTrigger: false,
  },
  {
    id: 'wf_duvida_entrega',
    workflowKey: 'duvida_entrega',
    name: 'Fluxo de Frete e Prazos',
    description: 'Informa regras de entrega e consulta status de pedidos existentes.',
    steps: [
      '1. Verificar se é cliente novo ou com pedido já realizado',
      '2. Para pedidos realizados: consultar status no ERP',
      '3. Para novos clientes: informar que entregamos somente em Curitiba e na Região Metropolitana, com a loja em Colombo/PR. Fora dessa área, dizer que não realizamos entrega. Dentro da área, frete grátis somente a menos de 5 km da loja; para distâncias maiores, solicitar endereço completo para confirmar valor e prazo. Se um endereço atendido não for localizado na consulta, acionar intervenção humana silenciosa',
    ],
    enabled: true,
    handoffTrigger: false,
  },
  {
    id: 'wf_reclamacao',
    workflowKey: 'reclamacao',
    name: 'Fluxo de Acolhimento e Assistência',
    description: 'Acolhimento imediato, coleta de informações e transferência prioritária.',
    steps: [
      '1. Acolher com empatia e tranquilizar o cliente',
      '2. Registrar número do pedido ou nome completo',
      '3. Acionar intervenção humana com motivo detalhado',
    ],
    enabled: true,
    handoffTrigger: true,
  },
  {
    id: 'wf_humano',
    workflowKey: 'humano',
    name: 'Fluxo de Escalonamento Silencioso para Atendente',
    description: 'Escalonamento sem ruído: quando a IA não sabe responder, aciona a equipe sem enviar mensagem ao cliente.',
    steps: [
      '1. Detectar falta de regra confiável, incerteza técnica ou solicitação de atendimento humano',
      '2. Interromper respostas externas e acionar intervenção humana silenciosa',
      '3. Atualizar ai_status para "needs_human", registrar nota interna e pausar a IA nesta conversa',
    ],
    enabled: true,
    handoffTrigger: true,
  },
] as const;
