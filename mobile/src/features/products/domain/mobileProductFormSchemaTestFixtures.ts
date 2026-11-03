export const baseValidProduct = {
  name: 'Guarda Roupa Paris',
  productKind: 'normal',
  categoryId: 'cat-1',
  categoryIds: ['cat-1'],
  mainSupplierId: 'sup-1',
  unitPrice: '1500,00',
  images: ['parent-photo.jpg'],
  width: '200',
  height: '220',
  depth: '60',
  merchandiseOrigin: 'third_party',
  technicalValues: {
    Marca: 'Morante',
    Modelo: 'Paris',
  },
  variations: [
    {
      id: 'var-1',
      sku: '000312-01',
      name: 'Branco',
      syncUnitPrice: true,
      syncWidth: true,
      syncHeight: true,
      syncDepth: true,
      attributes: [{ name: 'Cor', value: 'Branco' }],
    },
  ],
};
