import type { AiKnowledgeCategory } from '../../../../../../../../shared-utils/whatsappAiAgentSchemas';

export const CATEGORY_LABELS: Record<
  AiKnowledgeCategory,
  { label: string; icon: string; color: string }
> = {
  politica_entrega: {
    label: 'Entrega e Frete',
    icon: 'bi-truck',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
  },
  politica_montagem: {
    label: 'Montagem Própria',
    icon: 'bi-tools',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
  },
  garantia: {
    label: 'Garantia',
    icon: 'bi-shield-check',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
  },
  pagamentos: {
    label: 'Pagamento e Parcelamento',
    icon: 'bi-credit-card-2-front',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
  },
  loja_horarios: {
    label: 'Endereço e Horários',
    icon: 'bi-shop',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300',
  },
  faq: {
    label: 'Dúvidas Frequentes',
    icon: 'bi-question-circle',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300',
  },
  outros: {
    label: 'Outros Procedimentos',
    icon: 'bi-file-text',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
};
