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
    { id: 'logistica', label: 'Logística e Frete', icon: 'bi-truck', group: 'system', keywords: ['frete', 'km', 'distância', 'valor', 'entrega'] },
    { id: 'manuseio', label: 'Manuseio e Montagem', icon: 'bi-hand-index-thumb', group: 'system', keywords: ['manuseio', 'montagem', 'entrega', 'retirada', 'padrão'] },
    { id: 'aparencia', label: 'Aparência', icon: 'bi-palette', group: 'user', keywords: ['tema', 'escuro', 'claro', 'modo'] },
    { id: 'whatsapp', label: 'WhatsApp & Catálogo', icon: 'bi-whatsapp', group: 'system', keywords: ['whatsapp', 'api', 'token', 'catálogo', 'marketplace', 'vendas'] },
    { id: 'notificacoes', label: 'Notificações & Testes Push', icon: 'bi-bell-fill', group: 'system', keywords: ['notificação', 'alerta', 'push', 'teste', 'dispositivo'] },
    { id: 'templates', label: 'Mensagens & Templates', icon: 'bi-chat-quote-fill', group: 'system', keywords: ['mensagem', 'template', 'whatsapp', 'texto', 'avaliação', 'confirmação', 'grupo', 'promoções', 'ofertas'] },
    { id: 'fiscal', label: 'Tributação Padrão (NF-e/NFC-e)', icon: 'bi-file-earmark-spreadsheet-fill', group: 'system', keywords: ['tributação', 'fiscal', 'nfe', 'nfce', 'ncm', 'cest', 'csosn', 'cfop', 'simples', 'nacional', 'origem', 'icms'] },
    { id: 'bandeiras', label: 'Bandeiras e Juros de Cartão', icon: 'bi-credit-card-2-front', group: 'system', keywords: ['cartão', 'bandeira', 'juros', 'parcela', 'visa', 'mastercard', 'senff'] },
    { id: 'scanner', label: 'Leitor de Barras / Scanner', icon: 'bi-qr-code-scan', group: 'system', keywords: ['scanner', 'bip', 'pibe', 'barras', 'código', 'delay', 'atraso', 'vibração'] },
    { id: 'bling', label: 'Integração Bling (API v3)', icon: 'bi-clouds-fill', group: 'system', keywords: ['bling', 'api', 'v3', 'integração', 'estoque', 'sincronização', 'token', 'key'] },
];
