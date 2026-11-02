import { withTimeout } from '../../../../../shared-utils/withTimeout';
export const withMobileMutationTimeout = async <T,>(
  request: PromiseLike<T>,
  label: string
): Promise<T> => {
  const response = await withTimeout(
    Promise.resolve(request).then((value) => ({ value })),
    10_000,
    null,
    label
  );
  if (!response) throw new Error('A operação expirou. Verifique a conexão e tente novamente.');
  return response.value;
};
