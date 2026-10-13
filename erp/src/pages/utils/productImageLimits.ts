/** Limites oficiais de fotos para o cadastro de produtos. */
export const MAX_PARENT_PRODUCT_IMAGES = 75;
/** Limite de imagens enviado ao catálogo do WhatsApp durante a sincronização. */
export const MAX_WHATSAPP_PRODUCT_IMAGES = 75;
export const MAX_VARIATION_IMAGES = 15;

/** Limite de fotos da galeria do produto pai (fixo em 75 fotos). */
export const getMaxParentProductImages = (_variationCount = 0): number => MAX_PARENT_PRODUCT_IMAGES;
