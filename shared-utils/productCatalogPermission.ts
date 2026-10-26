const DEFAULT_CATALOG_PERMISSION_DENIAL =
  'Seu perfil não possui permissão para alterar o Catálogo Digital.';

/** Returns a user-facing message only for the database permission-denied contract. */
export const getProductCatalogPermissionDenialMessage = (error: unknown): string | null => {
  if (!error || typeof error !== 'object') return null;

  const databaseError = error as { code?: unknown; message?: unknown };
  if (databaseError.code !== '42501') return null;

  return typeof databaseError.message === 'string' && databaseError.message.trim()
    ? databaseError.message
    : DEFAULT_CATALOG_PERMISSION_DENIAL;
};

const DEFAULT_CATALOG_MUTATION_FAILURE_MESSAGE =
  'Não foi possível confirmar o resultado da alteração no Catálogo Digital. Atualize a lista antes de tentar novamente.';

/** Uses a neutral message because a multi-step persistence can partially succeed. */
export const getProductCatalogMutationFailureNotice = (
  error: unknown
): { title: string; message: string } => {
  const permissionMessage = getProductCatalogPermissionDenialMessage(error);
  if (permissionMessage) {
    return { title: 'Permissão insuficiente', message: permissionMessage };
  }

  return {
    title: 'Não foi possível confirmar a alteração',
    message: DEFAULT_CATALOG_MUTATION_FAILURE_MESSAGE,
  };
};
