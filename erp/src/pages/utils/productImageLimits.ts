/** Limite de imagens enviado ao catálogo do WhatsApp durante a sincronização. */
export const MAX_WHATSAPP_PRODUCT_IMAGES = 75;
export const MAX_VARIATION_IMAGES = 15;

/** O produto pai mantém pelo menos 15 fotos e ganha mais 15 por variação. */
export const getMaxParentProductImages = (variationCount = 0): number =>
  Math.max(1, variationCount) * MAX_VARIATION_IMAGES;
