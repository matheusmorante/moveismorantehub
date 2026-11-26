/** Default visibility used when a technical field becomes a variation override. */
export const getDefaultShowNameForVariationOverride = (attributeName: string): boolean =>
  !/^cor$/i.test(attributeName.trim());
