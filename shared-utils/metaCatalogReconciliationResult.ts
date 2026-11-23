export interface MetaCatalogReconciliationResult {
  success: boolean;
  count: number;
  created?: number;
  updated?: number;
  deleted?: number;
  unchanged?: number;
  errors?: number;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export function formatMetaCatalogRunSummary(run: MetaCatalogReconciliationResult): string {
  return `${run.created ?? 0} criados, ${run.updated ?? 0} atualizados, ${run.deleted ?? 0} excluídos, ${run.unchanged ?? 0} sem alterações e ${run.errors ?? 0} com erro.`;
}
