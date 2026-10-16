export type VariationTabId =
  | 'identificacao'
  | 'fotos'
  | 'estoque'
  | 'tecnico'
  | 'descricao'
  | 'compostos';

export interface VariationFormOperationGuard {
  pending: symbol | null;
  error: string;
}
