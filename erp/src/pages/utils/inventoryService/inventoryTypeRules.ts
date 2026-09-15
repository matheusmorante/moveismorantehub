export const INVENTORY_TABLE_NAME = "inventory_moves";

export const isEntryType = (t: string): boolean => t === 'entry';

export const isExitType = (t: string): boolean => t === 'exit' || t === 'withdrawal';

export const isAdjustmentType = (t: string): boolean => t === 'adjustment' || t === 'balance';
