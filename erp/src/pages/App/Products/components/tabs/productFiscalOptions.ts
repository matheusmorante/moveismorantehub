
export const CSOSN_OPTIONS: readonly FiscalOption[] = [
    { value: '102', label: '102 - Simples Nacional - Sem permissão de crédito (Venda padrão)' },
    { value: '500', label: '500 - Simples Nacional - ICMS Cobrado Anteriormente por ST (Substituído)' },
    { value: '101', label: '101 - Simples Nacional - Com permissão de crédito' },
    { value: '201', label: '201 - Simples Nacional - Com permissão de crédito e ST' },
    { value: '202', label: '202 - Simples Nacional - Sem permissão de crédito e ST' },
    { value: '300', label: '300 - Simples Nacional - Imune' },
    { value: '400', label: '400 - Simples Nacional - Não tributada' },
    { value: '900', label: '900 - Simples Nacional - Outros' },
];

export const CFOP_OPTIONS: readonly FiscalOption[] = [
    { value: '5102', label: '5102 - Venda de mercadoria adquirida/recebida de terceiros' },
    { value: '5405', label: '5405 - Venda de mercadoria sujeita a ST (Substituído)' },
    { value: '5101', label: '5101 - Venda de produção do estabelecimento' },
    { value: '5403', label: '5403 - Venda de produção do estabelecimento sujeita a ST' },
];

export const PIS_COFINS_OPTIONS: readonly FiscalOption[] = [
    { value: '49', label: '49 - Outras Operações de Saída' },
    { value: '07', label: '07 - Operação Isenta da Contribuição' },
    { value: '08', label: '08 - Operação Sem Incidência da Contribuição' },
    { value: '04', label: '04 - Operação Tributável Monofásica (Alíquota Zero)' },
    { value: '06', label: '06 - Operação Tributável com Alíquota Zero' },
    { value: '01', label: '01 - Operação Tributável com Alíquota Básica' },
    { value: '99', label: '99 - Outras Operações' },
];

export const CEST_OPTIONS: readonly FiscalOption[] = [
    { value: '', label: 'Sem Substituição Tributária (Nenhum / Nulo)' },
    { value: '2806100', label: '28.061.00 - Colchões e box-springs (ST)' },
    { value: '2806200', label: '28.062.00 - Suportes para camas (Estrados)' },
];

export const ORIGEM_OPTIONS: readonly FiscalOption[] = [
    { value: '0', label: '0 - Nacional' },
    { value: '1', label: '1 - Estrangeira - Importação Direta' },
    { value: '2', label: '2 - Estrangeira - Adquirida no Mercado Interno' },
    { value: '3', label: '3 - Nacional, conteúdo de importação > 40%' },
    { value: '4', label: '4 - Nacional, PPB' },
    { value: '5', label: '5 - Nacional, conteúdo de importação <= 40%' },
    { value: '6', label: '6 - Estrangeira - Importação Direta (CAMEX)' },
    { value: '7', label: '7 - Estrangeira - Adquirida no Mercado Interno (CAMEX)' },
    { value: '8', label: '8 - Nacional, conteúdo de importação > 70%' },
];

