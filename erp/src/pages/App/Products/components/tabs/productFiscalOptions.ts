export const COMMON_NCMS = [
    { code: '94035000', description: 'Móveis de madeira para dormitórios (Guarda-roupa, Cama, Cômoda, Cabeceira, Criado-Mudo)' },
    { code: '94036000', description: 'Outros móveis de madeira (Rack, Painel, Aparador, Mesa de Centro, Estante, Buffet)' },
    { code: '94016100', description: 'Assentos com armação de madeira, estofados (Sofá, Poltrona, Cadeira Estofada, Banqueta)' },
    { code: '94033000', description: 'Móveis de madeira para escritórios (Escrivaninha, Mesa de Reunião, Gaveteiro)' },
    { code: '94034000', description: 'Móveis de madeira para cozinhas (Armário, Balcão, Paneleiro, Kit Cozinha)' },
    { code: '94016900', description: 'Assentos com armação de madeira, não estofados (Cadeira de Madeira)' },
    { code: '94042100', description: 'Colchões de espuma (borracha ou plástico alveolar)' },
    { code: '94042900', description: 'Colchões de molas ou outros materiais' },
    { code: '94032000', description: 'Outros móveis de metal (Mesa com base de aço, Escrivaninha Industrial)' },
    { code: '94017100', description: 'Assentos com armação de metal, estofados (Banqueta Estofada, Cadeira de Metal)' },
    { code: '94017900', description: 'Assentos com armação de metal, não estofados' },
    { code: '94039090', description: 'Partes de móveis (Peças sobressalentes, portas, tampos)' },
    { code: '94038900', description: 'Móveis de outras matérias (Plástico, Vime, Junco, etc.)' },
    { code: '39249000', description: 'Utensílios de plástico para decoração ou uso doméstico' },
    { code: '70139900', description: 'Objetos de vidro para decoração (Vasos, Pratos Decorativos)' },
    { code: '94051090', description: 'Aparelhos de iluminação (Lustres, Luminárias de teto/parede)' },
];

export const CSOSN_OPTIONS = [
    { value: '102', label: '102 - Simples Nacional - Sem permissão de crédito (Venda padrão)' },
    { value: '500', label: '500 - Simples Nacional - ICMS Cobrado Anteriormente por ST (Substituído)' },
    { value: '101', label: '101 - Simples Nacional - Com permissão de crédito' },
    { value: '201', label: '201 - Simples Nacional - Com permissão de crédito e ST' },
    { value: '202', label: '202 - Simples Nacional - Sem permissão de crédito e ST' },
    { value: '300', label: '300 - Simples Nacional - Imune' },
    { value: '400', label: '400 - Simples Nacional - Não tributada' },
    { value: '900', label: '900 - Simples Nacional - Outros' },
];

export const CFOP_OPTIONS = [
    { value: '5102', label: '5102 - Venda de mercadoria adquirida/recebida de terceiros' },
    { value: '5405', label: '5405 - Venda de mercadoria sujeita a ST (Substituído)' },
    { value: '5101', label: '5101 - Venda de produção do estabelecimento' },
    { value: '5403', label: '5403 - Venda de produção do estabelecimento sujeita a ST' },
];

export const PIS_COFINS_OPTIONS = [
    { value: '49', label: '49 - Outras Operações de Saída' },
    { value: '07', label: '07 - Operação Isenta da Contribuição' },
    { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
    { value: '04', label: '04 - Operação Tributável Monofásica (Alíquota Zero)' },
    { value: '06', label: '06 - Operação Tributável com Alíquota Zero' },
    { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
    { value: '99', label: '99 - Outras Operações' },
];

export const CEST_OPTIONS = [
    { value: '', label: 'Sem Substituição Tributária (Nenhum / Nulo)' },
    { value: '2806100', label: '28.061.00 - Colchões e box-springs (ST)' },
    { value: '2806200', label: '28.062.00 - Suportes para camas (Estrados)' },
];

export const ORIGEM_OPTIONS = [
    { value: '0', label: '0 - Nacional' }, { value: '1', label: '1 - Estrangeira - Importação Direta' },
    { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' }, { value: '3', label: '3 - Nacional, conteúdo de importação > 40%' },
    { value: '4', label: '4 - Nacional, PPB' }, { value: '5', label: '5 - Nacional, conteúdo de importação <= 40%' },
    { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' }, { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
    { value: '8', label: '8 - Nacional, conteúdo de importação > 70%' },
];
