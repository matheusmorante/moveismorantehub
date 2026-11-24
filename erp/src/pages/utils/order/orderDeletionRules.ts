export const canPermanentlyDeleteDraft = (status?: string) => status === 'draft';

export const assertDeletedOrderId = (id: string, deletedRows?: Array<{ id?: string }> | null) => {
  if (!deletedRows?.some((row) => String(row.id) === String(id))) {
    throw new Error('O rascunho não foi excluído. Verifique as permissões e tente novamente.');
  }
};
