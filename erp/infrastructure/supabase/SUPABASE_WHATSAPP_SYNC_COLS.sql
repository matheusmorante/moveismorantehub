-- Migration to add WhatsApp sync controls to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS whatsapp_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ecommerce_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_auto_sync BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_whatsapp_sync TIMESTAMPTZ;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_products_whatsapp_sync ON products(whatsapp_sync);
CREATE INDEX IF NOT EXISTS idx_products_whatsapp_auto_sync ON products(whatsapp_auto_sync);

COMMENT ON COLUMN products.whatsapp_sync IS 'Define if the product should be visible in the WhatsApp catalog';
COMMENT ON COLUMN products.whatsapp_auto_sync IS 'If true, automatically updates WhatsApp visibility based on stock changes';
