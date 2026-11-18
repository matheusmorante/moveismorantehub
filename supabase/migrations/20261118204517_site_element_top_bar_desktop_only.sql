BEGIN;

ALTER TABLE public.site_element_top_bar_models
  ALTER COLUMN mobile_image_path DROP NOT NULL,
  ALTER COLUMN mobile_file_name DROP NOT NULL,
  ALTER COLUMN mobile_mime_type DROP NOT NULL,
  ALTER COLUMN mobile_size_bytes DROP NOT NULL,
  ALTER COLUMN mobile_width DROP NOT NULL,
  ALTER COLUMN mobile_height DROP NOT NULL,
  ALTER COLUMN tablet_image_path DROP NOT NULL,
  ALTER COLUMN tablet_file_name DROP NOT NULL,
  ALTER COLUMN tablet_mime_type DROP NOT NULL,
  ALTER COLUMN tablet_size_bytes DROP NOT NULL,
  ALTER COLUMN tablet_width DROP NOT NULL,
  ALTER COLUMN tablet_height DROP NOT NULL;

COMMENT ON TABLE public.site_element_top_bar_models IS
  'Modelos da barra de destaque exibida em desktop. A imagem principal é obrigatória; campos de celular e tablet são opcionais para compatibilidade com registros legados.';
COMMENT ON COLUMN public.site_element_top_bar_models.mobile_image_path IS
  'Campo legado opcional; modelos novos para desktop podem deixar este campo vazio.';
COMMENT ON COLUMN public.site_element_top_bar_models.tablet_image_path IS
  'Campo legado opcional; modelos novos para desktop podem deixar este campo vazio.';

COMMIT;
