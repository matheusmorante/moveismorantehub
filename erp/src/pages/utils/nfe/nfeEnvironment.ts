export const DEFAULT_NFE_ENVIRONMENT: 1 | 2 = 1;
export const NFE_ENVIRONMENTS = [
    { value: 1, title: 'Produção', detail: 'Documento fiscal válido' },
    { value: 2, title: 'Homologação', detail: 'Teste sem valor fiscal' },
] as const;
