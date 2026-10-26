/** Calculates the next six-digit code from product codes and variation SKUs. */
export const getNextSequentialProductCodeFromValues = (values: readonly unknown[]): string => {
  let maxNumber = 0;

  values.forEach((value) => {
    const match = String(value || '').trim().match(/^(\d+)/);
    const number = match?.[1] ? Number.parseInt(match[1], 10) : Number.NaN;
    if (Number.isFinite(number) && number > maxNumber) maxNumber = number;
  });

  return String(maxNumber + 1).padStart(6, '0');
};
