import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  productListPageSizeSchema,
  type ProductListPageSize,
} from '../../../../../shared-utils/listingFormSchemas';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

const STORAGE_OPERATION_TIMEOUT_MS = 1_000;

export type MobileProductPageSizePreferenceStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export const getMobileProductPageSizePreferenceKey = (
  userId: string | null | undefined,
  mode: 'standard' | 'composition',
) => userId ? `@morantehub:products:page-size:${userId}:${mode}` : null;

export const readMobileProductPageSizePreference = async (
  key: string | null,
  storage: MobileProductPageSizePreferenceStorage = AsyncStorage,
): Promise<ProductListPageSize | null> => {
  if (!key) return null;

  try {
    const value = await withTimeout(
      storage.getItem(key),
      STORAGE_OPERATION_TIMEOUT_MS,
      null,
      'preferência do tamanho da página de Produtos',
    );
    const parsed = productListPageSizeSchema.safeParse(Number(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const writeMobileProductPageSizePreference = async (
  key: string | null,
  pageSize: ProductListPageSize,
  storage: MobileProductPageSizePreferenceStorage = AsyncStorage,
) => {
  if (!key) return;

  try {
    await withTimeout(
      storage.setItem(key, String(pageSize)),
      STORAGE_OPERATION_TIMEOUT_MS,
      undefined,
      'gravação da preferência do tamanho da página de Produtos',
    );
  } catch {
    // A lista continua utilizável quando o armazenamento local está indisponível.
  }
};
