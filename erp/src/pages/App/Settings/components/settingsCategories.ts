export interface SettingsCategory {
    id: string;
    label: string;
    icon: string;
    group: 'system' | 'user';
    keywords: string[];
}

export const settingsCategories: SettingsCategory[] = [
    { id: 'empresa', label: 'Dados da Empresa', icon: 'bi-building-fill', group: 'system', keywords: ['empresa', 'nome', 'endereço', 'loja', 'origem', 'cnpj', 'contato', 'telefone'] },
    { id: 'labels', label: 'Rótulos do Sistema', icon: 'bi-tags-fill', group: 'system', keywords: ['rascunho', 'agendado', 'atendido', 'cancelado', 'entrega', 'retirada'] },
    { id: 'aparencia', label: 'Aparência', icon: 'bi-palette', group: 'user', keywords: ['tema', 'escuro', 'claro', 'modo'] },
    { id: 'whatsapp', label: 'WhatsApp & Catálogo', icon: 'bi-whatsapp', group: 'system', keywords: ['whatsapp', 'api', 'token', 'catálogo', 'marketplace', 'vendas'] },
    { id: 'notificacoes', label: 'Notificações & Testes Push', icon: 'bi-bell-fill', group: 'system', keywords: ['notificação', 'alerta', 'push', 'teste', 'dispositivo'] },
    { id: 'templates', label: 'Mensagens & Templates', icon: 'bi-chat-quote-fill', group: 'system', keywords: ['mensagem', 'template', 'whatsapp', 'texto', 'avaliação', 'confirmação', 'grupo', 'promoções', 'ofertas'] },
    { id: 'bling', label: 'Integração Bling (API v3)', icon: 'bi-clouds-fill', group: 'system', keywords: ['bling', 'api', 'v3', 'integração', 'estoque', 'sincronização', 'token', 'key'] },
    { id: 'impressao', label: 'Impressão Direta (Windows)', icon: 'bi-printer-fill', group: 'system', keywords: ['impressão', 'impressora', 'epson', 'l3250', 'agente', 'danfe', 'recibo', 'pedido', 'spooler'] },
];
