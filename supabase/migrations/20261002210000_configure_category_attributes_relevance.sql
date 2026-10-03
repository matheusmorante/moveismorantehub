-- Migration: 20261002210000_configure_category_attributes_relevance.sql
-- Vincula características específicas e relevantes a cada categoria de móveis do catálogo,
-- garantindo que apenas características pertinentes apareçam na ficha técnica de cada categoria
-- (conforme padrões de varejo moveleiro Magazine Luiza e Multiloja).

CREATE OR REPLACE FUNCTION public._sync_category_attributes(
  p_category_name text,
  p_attribute_names text[]
) RETURNS void AS $$
DECLARE
  v_category_id uuid;
  v_attr_id uuid;
  v_attr_name text;
BEGIN
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE type = 'category' AND lower(trim(name)) = lower(trim(p_category_name))
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. Remove vínculos anteriores para esta categoria que não estejam na lista de atributos relevantes
  DELETE FROM public.category_attributes
  WHERE category_id = v_category_id
    AND attribute_id NOT IN (
      SELECT id FROM public.attributes WHERE lower(trim(name)) = ANY(
        SELECT lower(trim(unnest(p_attribute_names)))
      )
    );

  -- 2. Insere os vínculos relevantes de forma idempotente
  FOREACH v_attr_name IN ARRAY p_attribute_names LOOP
    SELECT id INTO v_attr_id
    FROM public.attributes
    WHERE lower(trim(name)) = lower(trim(v_attr_name))
    LIMIT 1;

    IF v_attr_id IS NOT NULL THEN
      INSERT INTO public.category_attributes (category_id, attribute_id, is_required)
      VALUES (v_category_id, v_attr_id, false)
      ON CONFLICT (attribute_id, category_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 1. Sofás
SELECT public._sync_category_attributes('Sofás', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés', 'Rodízios'
]);

-- 2. Poltronas
SELECT public._sync_category_attributes('Poltronas', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés', 'Pés reguláveis', 'Rodízios'
]);

-- 3. Cadeiras para Sala de Jantar
SELECT public._sync_category_attributes('Cadeiras para Sala de Jantar', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés'
]);

-- 4. Cadeiras para Escritório
SELECT public._sync_category_attributes('Cadeiras para Escritório', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés', 'Rodízios', 'Pés reguláveis'
]);

-- 5. Cabeceiras
SELECT public._sync_category_attributes('Cabeceiras', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Espessura do MDF/MDP'
]);

-- 6. Colchões
SELECT public._sync_category_attributes('Colchões', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Tecido', 'Densidade da Espuma',
  'Altura', 'Largura', 'Profundidade', 'Peso'
]);

-- 7. Camas/Bases Box
SELECT public._sync_category_attributes('Camas/Bases Box', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Tecido',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés', 'Rodízios'
]);

-- 8. Beliches
SELECT public._sync_category_attributes('Beliches', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 9. Treliches
SELECT public._sync_category_attributes('Treliches', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 10. Berços
SELECT public._sync_category_attributes('Berços', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés', 'Rodízios',
  'Quantidade de gavetas', 'Tipo/material da corrediça'
]);

-- 11. Guarda-Roupas
SELECT public._sync_category_attributes('Guarda-Roupas', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Material das prateleiras', 'Quantidade de prateleiras', 'Peso suportado por prateleira',
  'Possui espelho', 'Quantidade de espelhos', 'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho',
  'Material do cabideiro', 'Quantidade de cabideiros', 'Calceiro', 'Maleiro', 'Divisão ele e ela'
]);

-- 12. Cômodas
SELECT public._sync_category_attributes('Cômodas', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira',
  'Possui espelho', 'Quantidade de espelhos', 'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho'
]);

-- 13. Sapateiras
SELECT public._sync_category_attributes('Sapateiras', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Material das prateleiras', 'Quantidade de prateleiras', 'Peso suportado por prateleira',
  'Possui espelho', 'Quantidade de espelhos', 'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho'
]);

-- 14. Penteadeiras
SELECT public._sync_category_attributes('Penteadeiras', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Possui espelho', 'Quantidade de espelhos', 'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho'
]);

-- 15. Mesas de Cabeceira
SELECT public._sync_category_attributes('Mesas de Cabeceira', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 16. Cozinhas Moduladas e Compactas
SELECT public._sync_category_attributes('Cozinhas Moduladas e Compactas', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 17. Balcões para Pia
SELECT public._sync_category_attributes('Balcões para Pia', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 18. Balcões com Tampo
SELECT public._sync_category_attributes('Balcões com Tampo', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 19. Balcões para Cooktop
SELECT public._sync_category_attributes('Balcões para Cooktop', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 20. Balcões com Fruteiras
SELECT public._sync_category_attributes('Balcões com Fruteiras', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 21. Balcões para Filtro de Àgua
SELECT public._sync_category_attributes('Balcões para Filtro de Àgua', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Material dos puxadores', 'Tipo de puxador', 'Material dos pés', 'Pés reguláveis', 'Rodízios',
  'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 22. Paneleiros
SELECT public._sync_category_attributes('Paneleiros', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 23. Armários Aéreos
SELECT public._sync_category_attributes('Armários Aéreos', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Material dos puxadores', 'Tipo de puxador', 'Quantidade de prateleiras', 'Material das prateleiras',
  'Peso suportado por prateleira', 'Possui espelho'
]);

-- 24. Armários para Fornos
SELECT public._sync_category_attributes('Armários para Fornos', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira'
]);

-- 25. Tampos
SELECT public._sync_category_attributes('Tampos', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso'
]);

-- 26. Pias
SELECT public._sync_category_attributes('Pias', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura',
  'Altura', 'Largura', 'Profundidade', 'Peso'
]);

-- 27. Racks
SELECT public._sync_category_attributes('Racks', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras',
  'Peso suportado por prateleira', 'Possui espelho'
]);

-- 28. Painéis
SELECT public._sync_category_attributes('Painéis', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de prateleiras', 'Material das prateleiras', 'Possui espelho'
]);

-- 29. Homes
SELECT public._sync_category_attributes('Homes', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras',
  'Peso suportado por prateleira', 'Possui espelho'
]);

-- 30. Aparadores Buffets
SELECT public._sync_category_attributes('Aparadores Buffets', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras', 'Possui espelho'
]);

-- 31. Cristaleiras
SELECT public._sync_category_attributes('Cristaleiras', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Quantidade de prateleiras', 'Material das prateleiras',
  'Peso suportado por prateleira', 'Possui espelho', 'Quantidade de espelhos'
]);

-- 32. Estantes
SELECT public._sync_category_attributes('Estantes', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de prateleiras', 'Material das prateleiras', 'Peso suportado por prateleira',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Material dos puxadores', 'Tipo de puxador', 'Material dos pés', 'Pés reguláveis'
]);

-- 33. Mesa para Sala de Jantar
SELECT public._sync_category_attributes('Mesa para Sala de Jantar', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés'
]);

-- 34. Conjunto para Sala de Jantar
SELECT public._sync_category_attributes('Conjunto para Sala de Jantar', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Tecido', 'Densidade da Espuma', 'Altura', 'Largura', 'Profundidade', 'Peso', 'Material dos pés'
]);

-- 35. Mesas para Escritório
SELECT public._sync_category_attributes('Mesas para Escritório', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de gavetas', 'Tipo/material da corrediça',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 36. Armários Multiuso
SELECT public._sync_category_attributes('Armários Multiuso', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Rodízios', 'Quantidade de prateleiras', 'Material das prateleiras',
  'Peso suportado por prateleira', 'Possui espelho'
]);

-- 37. Conjuntos para Banheiro
SELECT public._sync_category_attributes('Conjuntos para Banheiro', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP', 'Material do fundo',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Quantidade de portas', 'Tipo de portas', 'Material das portas',
  'Quantidade de gavetas', 'Tipo/material da corrediça', 'Material dos puxadores', 'Tipo de puxador',
  'Material dos pés', 'Pés reguláveis', 'Possui espelho', 'Quantidade de espelhos',
  'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho',
  'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- 38. Espelheira para Banheiro
SELECT public._sync_category_attributes('Espelheira para Banheiro', ARRAY[
  'Marca', 'Modelo', 'Linha', 'Cor', 'Material da estrutura', 'Acabamento', 'Espessura do MDF/MDP',
  'Altura', 'Largura', 'Profundidade', 'Peso', 'Possui espelho', 'Quantidade de espelhos',
  'Comprimento do espelho', 'Largura do espelho', 'Altura do espelho',
  'Quantidade de portas', 'Tipo de portas', 'Material das portas', 'Material dos puxadores', 'Tipo de puxador',
  'Quantidade de prateleiras', 'Material das prateleiras'
]);

-- Limpar função temporária
DROP FUNCTION IF EXISTS public._sync_category_attributes(text, text[]);
