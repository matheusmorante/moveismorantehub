-- Migration: 20261016220000_rename_corredica_to_materiais_das_corredicas_multiselect.sql
-- Renomeia característica para 'Tipo/Material das corrediças' e assegura data_type 'multi_select'
-- Atualiza opções em attribute_values e cadastra opções técnicas padronizadas

UPDATE public.attributes 
SET name = 'Tipo/Material das corrediças', data_type = 'multi_select' 
WHERE id = 'bc36d3ca-f2cd-4f6c-80cb-afac135537e6';

-- Atualiza opções padronizadas
UPDATE public.attribute_values 
SET value = 'Corrediça metálica telescópica' 
WHERE id = 'a8e5819f-4a25-4657-b9d2-e65ea75c3bf0';

UPDATE public.attribute_values 
SET value = 'Corrediça plástica' 
WHERE id = '25d6de07-95be-42d2-8d2e-f4a17d446087';

UPDATE public.attribute_values 
SET value = 'Corrediça de madeira' 
WHERE id = 'dd9dcd18-af06-4ad5-8653-c3032f6bae0b';

INSERT INTO public.attribute_values (attribute_id, value)
VALUES 
  ('bc36d3ca-f2cd-4f6c-80cb-afac135537e6', 'Guia de madeira'),
  ('bc36d3ca-f2cd-4f6c-80cb-afac135537e6', 'Guia plástica'),
  ('bc36d3ca-f2cd-4f6c-80cb-afac135537e6', 'Corrediça metálica oculta')
ON CONFLICT DO NOTHING;
