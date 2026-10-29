/**
 * Facade canônica para validação de publicação no Catálogo Digital.
 *
 * Módulos organizados e especializados em:
 * - ./catalogPublication/types.ts: Tipos e contratos de validação e prontidão
 * - ./catalogPublication/characteristicValues.ts: Normalização e leitura de características e números
 * - ./catalogPublication/categoryCharacteristics.ts: Avaliação de dependências e regras de categoria
 * - ./catalogPublication/legibilityValidation.ts: Verificação completa de prontidão para o catálogo
 * - ./catalogPublication/publicationActionValidation.ts: Guardas para publicação de produtos/variações
 * - ./catalogPublication/editConfirmation.ts: Mapeamento de pendências e mensagens do modal de confirmação
 */
export * from './catalogPublication';
