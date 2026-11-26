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
const META_CATALOG_REMOVAL_PENDING_PREFIX =
  'O status foi salvo no ERP, mas a Meta não confirmou a exclusão:';

/** Preserves known failures and uses a neutral fallback for partial multi-step writes. */
export const getProductCatalogMutationFailureNotice = (
  error: unknown
): { title: string; message: string } => {
  const permissionMessage = getProductCatalogPermissionDenialMessage(error);
  if (permissionMessage) {
    return { title: 'Permissão insuficiente', message: permissionMessage };
  }

  if (error instanceof Error && error.message.startsWith(META_CATALOG_REMOVAL_PENDING_PREFIX)) {
    return { title: 'Remoção pendente na Meta', message: error.message };
  }

  return {
    title: 'Não foi possível confirmar a alteração',
    message: DEFAULT_CATALOG_MUTATION_FAILURE_MESSAGE,
  };
};
