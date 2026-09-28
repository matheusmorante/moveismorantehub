export const DEFAULT_NFE_ENVIRONMENT: 1 | 2 = 2;
export const NFE_ENVIRONMENTS = [
  { value: 2, title: 'Homologação', detail: 'Teste sem valor fiscal' },
  { value: 1, title: 'Produção', detail: 'Documento fiscal válido' },
] as const;
