import type { ProductCatalogPrepareInput } from '../../../../shared-utils/productCatalogFormSchemas';

export type CatalogItem = ProductCatalogPrepareInput['items'][number];

const CATALOG_BASE_URL = 'https://www.moveismorante.com.br';

export const catalogItemUrl = (item: CatalogItem) => {
  if (!item.slug) {
    const params = new URLSearchParams({ i: `${item.productId}~${item.variationId || ''}` });
    return `${CATALOG_BASE_URL}/selecionados?${params.toString()}`;
  }
  const url = new URL(`/produto/${encodeURIComponent(item.slug)}`, CATALOG_BASE_URL);
  if (item.variationId) url.searchParams.set('var', item.variationId);
  return url.toString();
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

const plainText = (value: string) => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const loadPdfImage = async (imageUrl: string): Promise<string | null> => {
  if (!imageUrl) return null;
  try {
    const absoluteUrl = new URL(imageUrl, CATALOG_BASE_URL).toString();
    const response = await fetch(absoluteUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, image.naturalWidth);
      canvas.height = Math.max(1, image.naturalHeight);
      const context = canvas.getContext('2d');
      if (!context) return null;
      context.drawImage(image, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
};

export const generateCatalogPdf = async (
  items: CatalogItem[],
  hidePrices: boolean,
  onProgress: (progress: number) => void,
  onPdfPrepared?: (file: File) => boolean,
) => {
  const { jsPDF } = await import('jspdf');
  const images: Array<string | null> = Array.from({ length: items.length }, () => null);
  let cursor = 0;
  let completed = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      images[index] = await loadPdfImage(items[index].imageUrl || '');
      completed += 1;
      onProgress(Math.round((completed / Math.max(items.length, 1)) * 100));
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, items.length) }, () => worker()));

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  items.forEach((item, index) => {
    if (index > 0 && index % 2 === 0) pdf.addPage();
    const y = 14 + (index % 2) * 137;
    const title = [item.name, item.variationName].filter(Boolean).join(' · ');
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(14, y, pageWidth - 28, 126, 4, 4, 'S');
    if (images[index]) pdf.addImage(images[index]!, 'JPEG', 20, y + 7, 66, 68, undefined, 'FAST');
    else {
      pdf.setFillColor(241, 245, 249);
      pdf.roundedRect(20, y + 7, 66, 68, 3, 3, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Imagem indisponível', 53, y + 43, { align: 'center', maxWidth: 60 });
    }
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(pdf.splitTextToSize(title, pageWidth - 125).slice(0, 3), 94, y + 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(71, 85, 105);
    const description = item.description ? plainText(item.description) : 'Consulte mais detalhes no catálogo digital.';
    pdf.text(pdf.splitTextToSize(description, pageWidth - 125).slice(0, 6), 94, y + 38);
    if (!hidePrices) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(22, 101, 52);
      pdf.text(formatPrice(item.price), 94, y + 91);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(pdf.splitTextToSize(catalogItemUrl(item), pageWidth - 125).slice(0, 2), 94, y + 105);
  });
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Móveis Morante · ${page}/${pageCount}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
  const missingImages = images.filter((image) => image === null).length;
  if (onPdfPrepared) {
    const file = new File([pdf.output('blob') as Blob], 'catalogo-moveis-morante.pdf', { type: 'application/pdf' });
    return { missingImages, addedToComposer: onPdfPrepared(file) };
  }
  pdf.save('catalogo-moveis-morante.pdf');
  return { missingImages, addedToComposer: false };
};
