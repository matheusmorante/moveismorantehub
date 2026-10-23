/** Fields that the basic product form keeps synchronized with the product name. */
export const productTitleFieldsFromName = (name: string) => ({
  title: name,
  marketplaceTitle: name,
});
