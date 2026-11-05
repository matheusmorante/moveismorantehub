import { listWebInventoryDrafts } from './inventoryLocalDrafts';

export const listReservedLocalInventoryCodes = async (excludedDraftId: string): Promise<string[]> => {
  const drafts = await listWebInventoryDrafts();
  return drafts
    .filter((draft) => draft.id !== excludedDraftId)
    .map((draft) => draft.code.trim())
    .filter((code) => /^\d{1,6}$/.test(code))
    .map((code) => code.padStart(6, '0'));
};
