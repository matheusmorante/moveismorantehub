import { extractNfeAccessKeyFromOcrText } from '../../../../../../shared-utils/fiscalIdentifiers';

export const extractNfeAccessKey = (value: string): string | null =>
  extractNfeAccessKeyFromOcrText(value);
