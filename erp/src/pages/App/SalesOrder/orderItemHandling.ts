type ItemWithHandlingType = {
  handlingType?: string | null;
};

export const resolveFirstItemHandlingType = (
  items?: readonly ItemWithHandlingType[] | null
): string => items?.find((item) => item.handlingType?.trim())?.handlingType || '';
