-- START TRANSACTION FOR ENRICHING TARGET PRODUCTS
BEGIN;

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"182","Largura":"100","Profundidade":"38","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Modelo":"Dubai","Quantidade de gavetas":"0 gavetas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182'),
      width = COALESCE(NULLIF(width, '0'), '100'),
      depth = COALESCE(NULLIF(depth, '0'), '38'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = '5511f886-6626-45c8-8c9b-3d6b55305c19';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":"Freijó Matt/Areia","Peso":"66","Marca":"Cadorin","Altura":"194","Largura":"180","Acabamento":"Pintura UV","Profundidade":"53","Tipo de portas":"Bater","Tipo de puxador":"Perfil","Material da estrutura":"MDP","Tipo/material da corrediça":"Corrediça metálica simples","Peso suportado por prateleira":5,"Modelo":"Dália New","Quantidade de portas":"6 portas","Quantidade de gavetas":"1 gaveta"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '194'),
      width = COALESCE(NULLIF(width, '0'), '180'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
      updated_at = NOW()
    WHERE id = '00c3f0d7-8ccd-4808-8802-79055e967332';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Atualle","Modelo":"São Paulo","Altura":"226","Largura":"218.5","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '226'),
      width = COALESCE(NULLIF(width, '0'), '218.5'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Atualle' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'defacf2b-29de-4f9d-b6a8-c390f0230876';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Cadorin","Modelo":"Laura","Altura":"88.5","Largura":"120","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '88.5'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'd21b9a4b-c8e4-4c62-a0e7-a2cf4e172e7c';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Doripel","Modelo":"Montevideu","Altura":"175","Largura":"137","Profundidade":"38","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '175'),
      width = COALESCE(NULLIF(width, '0'), '137'),
      depth = COALESCE(NULLIF(depth, '0'), '38'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'aa7cb89d-a3b3-4899-9c63-910926a5177c';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Luciane","Modelo":"Isis","Altura":"84","Largura":"120","Profundidade":"53","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '84'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Luciane' ELSE brand END,
      updated_at = NOW()
    WHERE id = '5e67172a-2909-4b8f-bbe5-37b6fff5d0d1';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Darmovel","Altura":"81.5","Largura":"120","Profundidade":"51","Tipo de portas":"Bater","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Pop","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '81.5'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '3e1797d3-80f8-4423-a18a-07ce7b010baa';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"5 gavetas","Marca":"Evidência","Modelo":"CP25","Altura":"93","Largura":"123","Profundidade":"40","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '93'),
      width = COALESCE(NULLIF(width, '0'), '123'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
      updated_at = NOW()
    WHERE id = '4f0c805a-cbc9-49e0-8be2-7ae2d7c10b76';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Marca":"Notável Móveis","Modelo":"NT 3075","Altura":"122","Largura":"67","Profundidade":"42","Quantidade de gavetas":"0 gavetas"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '122'),
      width = COALESCE(NULLIF(width, '0'), '67'),
      depth = COALESCE(NULLIF(depth, '0'), '42'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = '5f3d2a9b-710d-4f00-a978-53ad533293bc';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Marca":"Notável Móveis","Modelo":"NT 3110","Altura":"87.3","Largura":"75.4","Profundidade":"52","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '87.3'),
      width = COALESCE(NULLIF(width, '0'), '75.4'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'adce8049-ba7e-4da7-a5dd-5a66369ed5c9';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"200","Largura":"159.4","Profundidade":"54.3","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Rudá"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '159.4'),
      depth = COALESCE(NULLIF(depth, '0'), '54.3'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'ddb06fbb-0524-4c37-8882-68a0b4d46d45';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"218","Largura":"208","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Fortaleza","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '218'),
      width = COALESCE(NULLIF(width, '0'), '208'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '33a234cf-3003-4614-9106-b0f4ffcb169b';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"213","Largura":"263","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Marca":"Atualle","Modelo":"Tunísia","Quantidade de portas":"11 portas","Tipo/material da corrediça":"Corrediça metálica simples","Peso":"131.9","Espessura do MDF/MDP":"15 mm"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '213'),
      width = COALESCE(NULLIF(width, '0'), '263'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Atualle' ELSE brand END,
      updated_at = NOW()
    WHERE id = '9193bcb1-ff4e-47ed-b8d6-60aca392b9e2';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Marca":"Demóbile","Modelo":"Cádis","Altura":"217","Largura":"200","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '217'),
      width = COALESCE(NULLIF(width, '0'), '200'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
      updated_at = NOW()
    WHERE id = '293f82ef-0ea1-459f-8060-2a8e5cbe6a27';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":"Preto","Marca":"Maxel","Altura":"200","Modelo":"Paris","Largura":"237","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Material da estrutura":"MDP","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '237'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'c0cda89f-8971-4146-bce7-0c4ead887f24';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"78.5","Largura":"160","Profundidade":"50.5","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Darmovel","Modelo":"Darmovel 1,60m","Quantidade de portas":"3 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '78.5'),
      width = COALESCE(NULLIF(width, '0'), '160'),
      depth = COALESCE(NULLIF(depth, '0'), '50.5'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '0dce5b6f-d093-466f-8ada-c8d005bccf39';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"105","Largura":"147","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Texas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '105'),
      width = COALESCE(NULLIF(width, '0'), '147'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'bb8ec31b-92a3-4116-9fb6-5d6520f5e0ae';
  

      DELETE FROM public.product_categories 
      WHERE product_id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

      INSERT INTO public.product_categories (product_id, category_id)
      SELECT '72020dcc-fb0a-4982-a12d-a8d2fc434df4'::uuid, 'b3a1a235-fd4c-4706-a058-6f8200b3731a'::uuid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_categories 
        WHERE product_id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4' AND category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a'
      );
    

    UPDATE public.products
    SET 
      
      category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a',
    
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":"Freijó","Peso":"80.8","Altura":"200","Largura":"186","Profundidade":"53","Marca":"Cadorin","Modelo":"Grazi","Material da estrutura":"MDP","Tipo de portas":"Bater + Basculante","Quantidade de portas":"8 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não","Espessura do MDF/MDP":"15 mm","Material dos puxadores":"Plástico / ABS","Pés reguláveis":"Sim"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '186'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
      updated_at = NOW()
    WHERE id = '72020dcc-fb0a-4982-a12d-a8d2fc434df4';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"210","Largura":"180","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Faimec","Modelo":"Fênix","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '210'),
      width = COALESCE(NULLIF(width, '0'), '180'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '6e4001b4-a3a4-4bed-bf6a-ab2e763714ab';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"JK","Altura":"196","Largura":"239","Profundidade":"53","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDP","Modelo":"JK 3 Peças","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '196'),
      width = COALESCE(NULLIF(width, '0'), '239'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
      updated_at = NOW()
    WHERE id = '6cfb0413-a223-4585-9dab-c2024d26e93b';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"115.2","Largura":"120","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '115.2'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'f7f78130-c551-478d-afb6-c1713b2afb3a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"JK","Altura":"81","Largura":"119","Profundidade":"52","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"JK 1ª Linha","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '81'),
      width = COALESCE(NULLIF(width, '0'), '119'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
      updated_at = NOW()
    WHERE id = '087bb01e-812c-4040-b743-2aebc77f46e6';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Móveis Sul","Altura":"87","Largura":"120","Profundidade":"50","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Florença","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '87'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '50'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'f56e238f-a86c-4f5e-853b-7d63c5c963b8';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Móveis Sul","Altura":"220","Largura":"320","Profundidade":"53","Tipo de portas":"Bater + Basculante","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Florença","Quantidade de portas":"14 portas","Material dos puxadores":"Alumínio / Metal","Pés reguláveis":"Sim","Acabamento":"Pintura UV"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '220'),
      width = COALESCE(NULLIF(width, '0'), '320'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
      updated_at = NOW()
    WHERE id = '5d61e058-002e-49d7-9b3d-e4bae4d03d5e';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"230","Largura":"160","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Turim","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '230'),
      width = COALESCE(NULLIF(width, '0'), '160'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '48eb76af-d842-4b91-a40c-35e41c7e6a7b';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"92","Largura":"120","Profundidade":"41","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Modelo":"Grécia","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '92'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '41'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '72e47b08-965a-4db7-ac1c-7e9743586ef1';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"182","Largura":"71","Profundidade":"39","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Demóbile","Modelo":"Grife"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182'),
      width = COALESCE(NULLIF(width, '0'), '71'),
      depth = COALESCE(NULLIF(depth, '0'), '39'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'c19d34fc-191d-4e23-aae5-7af7321fc5ed';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Marca":"Made Marcs","Modelo":"Atlanta","Altura":"218","Largura":"206","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '218'),
      width = COALESCE(NULLIF(width, '0'), '206'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Made Marcs' ELSE brand END,
      updated_at = NOW()
    WHERE id = '475b8290-6320-4d1d-8bd6-3bdda428d06a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"115","Largura":"155","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"100% MDF","Quantidade de gavetas":"5 gavetas","Modelo":"França","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '115'),
      width = COALESCE(NULLIF(width, '0'), '155'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '798c86ef-417a-44b1-85f5-6d54f3d739f7';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"203","Largura":"178","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Verona"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '203'),
      width = COALESCE(NULLIF(width, '0'), '178'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'cde26f3b-960e-4bc7-8a90-574978db8cab';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"218","Largura":"210","Profundidade":"52","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Demóbile","Modelo":"Moema"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '218'),
      width = COALESCE(NULLIF(width, '0'), '210'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'b8afe24e-9f26-4ab5-ac57-9dfb1fc58641';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Marca":"Henn","Modelo":"Aconchego","Altura":"103","Largura":"126.5","Profundidade":"51","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '103'),
      width = COALESCE(NULLIF(width, '0'), '126.5'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Henn' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'ca82da46-22b2-4f7d-a54f-43a05b574172';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"218","Largura":"210","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Sonata","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '218'),
      width = COALESCE(NULLIF(width, '0'), '210'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = '06ad2d9e-4763-4703-aa87-5e7ebf3aed25';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"182.5","Largura":"161.7","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Pequim","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182.5'),
      width = COALESCE(NULLIF(width, '0'), '161.7'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'ed1c4afb-a5e6-48b7-a39e-89d8cbe15bd2';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Marca":"Evidência","Modelo":"New Mônaco","Altura":"183","Largura":"183","Profundidade":"40","Quantidade de gavetas":"12 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '183'),
      width = COALESCE(NULLIF(width, '0'), '183'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'c30fb474-b911-4908-a125-a5a4ca878f6a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"Faimec","Modelo":"Salvador","Altura":"218","Largura":"208","Profundidade":"45","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '218'),
      width = COALESCE(NULLIF(width, '0'), '208'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '9d200152-002d-4b1a-aeed-10e2b2e0b121';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"100% MDF","Quantidade de gavetas":"2 gavetas","Marca":"Doripel","Modelo":"New Xangai","Altura":"200","Largura":"180","Profundidade":"47","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '180'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '2137aa68-63fc-4590-86d7-05549c1e78e9';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"182.25","Largura":"81.4","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Modelo":"Moscou","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182.25'),
      width = COALESCE(NULLIF(width, '0'), '81.4'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = '77725a3f-d9f6-4761-b201-007728772a00';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDP","Marca":"Faimec","Modelo":"Portugal","Altura":"223","Largura":"85","Profundidade":"48","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Possui espelho":"Não","Material do cabideiro":"Alumínio","Material dos puxadores":"Plástico / ABS"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '223'),
      width = COALESCE(NULLIF(width, '0'), '85'),
      depth = COALESCE(NULLIF(depth, '0'), '48'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '1ccb82a9-d395-4c79-8b1a-4773c0262444';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"222","Largura":"150","Profundidade":"48","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Flórida","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '222'),
      width = COALESCE(NULLIF(width, '0'), '150'),
      depth = COALESCE(NULLIF(depth, '0'), '48'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '296e2933-e6f1-454d-a9d8-49e4f01793d5';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"THB","Modelo":"Splendore Glass","Altura":"206","Largura":"181","Profundidade":"49","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '206'),
      width = COALESCE(NULLIF(width, '0'), '181'),
      depth = COALESCE(NULLIF(depth, '0'), '49'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'THB' ELSE brand END,
      updated_at = NOW()
    WHERE id = '0bba8b5a-581f-4531-9b76-7c2e214bddf2';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"92.5","Largura":"93.8","Profundidade":"44.8","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Lille","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '92.5'),
      width = COALESCE(NULLIF(width, '0'), '93.8'),
      depth = COALESCE(NULLIF(depth, '0'), '44.8'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'b52f7fa5-a823-4a0a-8926-d683d7eb4aae';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Marca":"Notável Móveis","Modelo":"NT 5015","Altura":"187","Largura":"161","Profundidade":"44","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '187'),
      width = COALESCE(NULLIF(width, '0'), '161'),
      depth = COALESCE(NULLIF(depth, '0'), '44'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'e5a0823a-91f5-401f-9f9e-98305260df7c';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"182","Largura":"135","Profundidade":"38","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Móveis Morante","Modelo":"Capri","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182'),
      width = COALESCE(NULLIF(width, '0'), '135'),
      depth = COALESCE(NULLIF(depth, '0'), '38'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
      updated_at = NOW()
    WHERE id = '631e81eb-acaa-4b00-8b93-a76dca51f6f4';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"230","Largura":"270","Profundidade":"56","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Bianchi","Modelo":"Siena","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '230'),
      width = COALESCE(NULLIF(width, '0'), '270'),
      depth = COALESCE(NULLIF(depth, '0'), '56'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Bianchi' ELSE brand END,
      updated_at = NOW()
    WHERE id = '6b63baaa-2472-44e7-8d56-9a6cfcf80bc5';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"90","Largura":"89","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Malta","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '90'),
      width = COALESCE(NULLIF(width, '0'), '89'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '74d22668-4f18-4dc2-aa8a-e0be1644cceb';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"181","Largura":"82","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Material da estrutura":"MDP/Madeira Maciça","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Chile","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '181'),
      width = COALESCE(NULLIF(width, '0'), '82'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '1b0f56ea-cff0-4809-b294-a2b07bfe0d32';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"216","Largura":"207","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Flórida","Possui espelho":"Não","Peso":"134","Espessura do MDF/MDP":"15 mm","Material do cabideiro":"Alumínio","Material dos puxadores":"MDF","Acabamento":"Pintura UV"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '216'),
      width = COALESCE(NULLIF(width, '0'), '207'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '0c02d580-ca8d-43b7-9f4d-40763d960a68';
  

      UPDATE public.product_variations
      SET 
        attributes = '{"Cor":"Freijó/Grafite"}'::jsonb,
        updated_at = NOW()
      WHERE id = '93048b8b-41dc-47ef-9af1-f633b4d98919';
    

      UPDATE public.product_variations
      SET 
        attributes = '{"Cor":"Freijó/Off White"}'::jsonb,
        updated_at = NOW()
      WHERE id = '6be30515-9326-41f9-b029-344c8611ccf2';
    

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"108","Largura":"147","Profundidade":"47","Material da estrutura":"MDP","Quantidade de gavetas":"8 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Geórgia","Quantidade de portas":"0 portas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '108'),
      width = COALESCE(NULLIF(width, '0'), '147'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = '4b064f92-bf4b-4348-bf02-deaa35884a4e';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"200","Largura":"237","Profundidade":"47","Quantidade de portas":"8 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Marca":"Maxel","Modelo":"Paris","Tipo de portas":"Bater","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '237'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '5f44c0e1-1596-4f27-adc8-9f0afce089f7';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"182","Largura":"108","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Modelo":"Tóquio","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '182'),
      width = COALESCE(NULLIF(width, '0'), '108'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'd2417fef-5ee1-453f-9e02-48e93a37681f';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"230","Largura":"175","Profundidade":"51","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Viena","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '230'),
      width = COALESCE(NULLIF(width, '0'), '175'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '274ef28d-65c3-4bca-a5c6-6dd78f10456f';
  

      -- Fix Cama Box Cristalflex category
      UPDATE public.products 
      SET category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
      WHERE id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17';

      DELETE FROM public.product_categories 
      WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

      INSERT INTO public.product_categories (product_id, category_id)
      SELECT 'a846c89e-1b6d-4f41-8142-34a97b0c9d17'::uuid, 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'::uuid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_categories 
        WHERE product_id = 'a846c89e-1b6d-4f41-8142-34a97b0c9d17' AND category_id = 'c2e94000-f3ce-4c4f-80f7-ee0476793a59'
      );
    

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"205","Largura":"120","Profundidade":"45","Quantidade de portas":"4 portas","Material da estrutura":"MDP/Metal","Quantidade de gavetas":"2 gavetas","Marca":"Faimec","Modelo":"Siena","Tipo de portas":"Bater","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '205'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '08112768-4ccf-4a95-b69b-b311498cc626';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"97","Largura":"108","Profundidade":"45.3","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"8 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Moval","Modelo":"Lara","Quantidade de portas":"0 portas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '97'),
      width = COALESCE(NULLIF(width, '0'), '108'),
      depth = COALESCE(NULLIF(depth, '0'), '45.3'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = '4ab2308b-20f9-42f6-a025-901b4b649ced';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"100","Largura":"97","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Vênus","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '100'),
      width = COALESCE(NULLIF(width, '0'), '97'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'd1515942-aa91-43e8-8606-fac37af6135c';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"83","Largura":"80","Profundidade":"52","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Marca":"Notável Móveis","Modelo":"Apolo","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '83'),
      width = COALESCE(NULLIF(width, '0'), '80'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'a5c6dd78-f819-4f48-b0d4-381d74111e9a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"204","Largura":"112","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Monza","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '204'),
      width = COALESCE(NULLIF(width, '0'), '112'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'b9f1bb8a-8e5a-48c5-ab8c-e065f3ea4078';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"78","Largura":"119","Profundidade":"51.5","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Econômico","Quantidade de portas":"2 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '78'),
      width = COALESCE(NULLIF(width, '0'), '119'),
      depth = COALESCE(NULLIF(depth, '0'), '51.5'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = '6dd07ec2-87bc-4497-90a7-59093d1ca220';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":"Preto","Peso":76.5,"Marca":"Evidência","Altura":"181","Modelo":"Isabela","Largura":"150","Profundidade":"40","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"9 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '181'),
      width = COALESCE(NULLIF(width, '0'), '150'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
      updated_at = NOW()
    WHERE id = '54d30bc1-06d2-4c4a-b926-3a1f4665ce63';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Darmovel","Altura":"196","Largura":"120","Profundidade":"42","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Modelo":"Lorena"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '196'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '42'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '53b681e2-b5f7-4011-a2d7-79fd3ac978f9';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"200","Largura":"160","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '160'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'acd1d298-aad0-46bf-913b-18bb4541c750';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"217","Largura":"200","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Demóbile","Modelo":"Cadis"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '217'),
      width = COALESCE(NULLIF(width, '0'), '200'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'a9408296-e1f9-462c-b4b0-f96ff1e5dc4d';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"80","Largura":"157","Profundidade":"50","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Móveis Morante","Modelo":"1ª Linha","Tipo de portas":"Bater","Quantidade de portas":"3 portas","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '80'),
      width = COALESCE(NULLIF(width, '0'), '157'),
      depth = COALESCE(NULLIF(depth, '0'), '50'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
      updated_at = NOW()
    WHERE id = '1e66d8e5-b521-498e-bd98-99e82f90a6b6';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"175","Largura":"90","Profundidade":"34","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Marca":"Doripel","Modelo":"Dueto","Quantidade de gavetas":"0 gavetas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '175'),
      width = COALESCE(NULLIF(width, '0'), '90'),
      depth = COALESCE(NULLIF(depth, '0'), '34'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '45570901-f295-46b2-984d-96af85e0079a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"221","Largura":"140","Profundidade":"52","Tipo de portas":"Correr","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Espanha","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '221'),
      width = COALESCE(NULLIF(width, '0'), '140'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '26e7bbd1-369c-4e94-8d50-ae527f7c46e4';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"231.8","Largura":"267","Profundidade":"51","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Morante","Modelo":"Florence","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '231.8'),
      width = COALESCE(NULLIF(width, '0'), '267'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Morante' ELSE brand END,
      updated_at = NOW()
    WHERE id = '69d2f7c6-9ec0-473f-ae73-36b774b3dda8';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"200","Largura":"237","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDF/Madeira Maciça","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Maxel","Modelo":"Genebra","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '237'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'd8c72a0d-6cef-4043-93e4-dc00e6d5368a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"235","Largura":"238","Profundidade":"47","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Damulti","Modelo":"Serena"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '235'),
      width = COALESCE(NULLIF(width, '0'), '238'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Damulti' ELSE brand END,
      updated_at = NOW()
    WHERE id = '24a68db0-4ac0-4c67-95a9-034721380c47';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"217","Largura":"270","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Indekes","Modelo":"Star","Quantidade de portas":"12 portas","Peso":"140.6","Material dos pés":"Plástico / ABS"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '217'),
      width = COALESCE(NULLIF(width, '0'), '270'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Indekes' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'ad84c244-3090-4bf8-b7d3-4a7493d77fa2';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"190","Largura":"120","Profundidade":"42","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Qmovi","Modelo":"Q Encanto Slim","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '190'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '42'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Qmovi' ELSE brand END,
      updated_at = NOW()
    WHERE id = '77b05ad0-ca46-43eb-8c2a-b728b126c921';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"180","Largura":"150","Profundidade":"40","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"9 gavetas","Marca":"Evidência","Modelo":"Bergamo","Tipo/material da corrediça":"Guia plástica","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '180'),
      width = COALESCE(NULLIF(width, '0'), '150'),
      depth = COALESCE(NULLIF(depth, '0'), '40'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Evidência' ELSE brand END,
      updated_at = NOW()
    WHERE id = '4bd6ef9b-66be-4ed4-beeb-40986f18c799';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"101","Largura":"125","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Demóbile","Modelo":"Flora","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '101'),
      width = COALESCE(NULLIF(width, '0'), '125'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Demóbile' ELSE brand END,
      updated_at = NOW()
    WHERE id = '9c10a576-f840-4e8c-8369-5ac71c98f599';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"240.5","Largura":"273","Profundidade":"63","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/Vidro","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Gelius","Modelo":"Absolut","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '240.5'),
      width = COALESCE(NULLIF(width, '0'), '273'),
      depth = COALESCE(NULLIF(depth, '0'), '63'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Gelius' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'ae5b20d5-6d41-43ec-93ff-23af2183c7f6';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"210","Largura":"180","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Marca":"Faimec","Modelo":"Siena","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '210'),
      width = COALESCE(NULLIF(width, '0'), '180'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'e7108621-e13d-47ea-a58d-f8b6c2f7f5af';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"186","Largura":"99.8","Profundidade":"41.3","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Coimbra","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '186'),
      width = COALESCE(NULLIF(width, '0'), '99.8'),
      depth = COALESCE(NULLIF(depth, '0'), '41.3'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'c6301350-a004-436d-af20-01d47a5d53b0';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Darmovel","Tipo de portas":"Bater","Quantidade de portas":"8 portas","Material da estrutura":"MDP","Modelo":"Pop / Gênova","Altura":"55","Largura":"120","Profundidade":"32","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '55'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '32'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
      updated_at = NOW()
    WHERE id = '4b8db5d2-5eff-44f7-a3ca-ff64aa6f9e71';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Altura":"210","Largura":"180","Profundidade":"45","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Cor":null,"Marca":"Faimec","Modelo":"Siena","Material da estrutura":"MDP"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '210'),
      width = COALESCE(NULLIF(width, '0'), '180'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '37bfc8f5-39c8-4dc1-a5fa-3fef3b879fad';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Móveis Sul","Altura":"220","Largura":"320","Profundidade":"53","Tipo de portas":"Bater + Basculante","Material da estrutura":"100% MDF","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Florença","Quantidade de portas":"14 portas","Material dos puxadores":"Alumínio / Metal","Pés reguláveis":"Sim","Acabamento":"Pintura UV"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '220'),
      width = COALESCE(NULLIF(width, '0'), '320'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
      updated_at = NOW()
    WHERE id = '8ce4da89-ef4a-4a70-b71a-2a53266a53f1';
  

      UPDATE public.product_variations
      SET 
        attributes = '{"0":{"name":"Cor","value":"Canary/Off White","showName":true},"Cor":"Canary/Off White"}'::jsonb,
        updated_at = NOW()
      WHERE id = '9826e7ca-e2b8-422a-b73d-3961d061d729';
    

      UPDATE public.product_variations
      SET 
        attributes = '{"0":{"name":"Cor","value":"Angelin/Cinza","showName":true},"Cor":"Angelin/Cinza"}'::jsonb,
        updated_at = NOW()
      WHERE id = 'd5919f46-45aa-4337-9a75-9fb0fd400678';
    

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"108.5","Largura":"108","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Notável Móveis","Modelo":"4","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '108.5'),
      width = COALESCE(NULLIF(width, '0'), '108'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Notável Móveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'de0fcded-8739-48a3-9ee9-d15f45d575dc';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Castro","Altura":"210","Largura":"198","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Londres","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '210'),
      width = COALESCE(NULLIF(width, '0'), '198'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Castro' ELSE brand END,
      updated_at = NOW()
    WHERE id = '44133b5f-2d30-41b3-8b7a-73758d1691d0';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"235","Largura":"230","Profundidade":"47","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"2030","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '235'),
      width = COALESCE(NULLIF(width, '0'), '230'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = '96c68260-b578-442e-94f1-494b09bea8c4';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":"Branco","Marca":"Doripel","Altura":"175","Modelo":"Sidney","Largura":"137","Profundidade":"38","Material da estrutura":"MDP","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Guia plástica","Possui espelho":"Não","Peso":"62","Material do cabideiro":"Madeira","Material dos puxadores":"Plástico / ABS"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '175'),
      width = COALESCE(NULLIF(width, '0'), '137'),
      depth = COALESCE(NULLIF(depth, '0'), '38'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'a83d234b-9682-434e-bac3-3c9808d168b2';
  

      UPDATE public.product_variations
      SET 
        attributes = '{"0":{"name":"Cor","value":"Preto"},"Cor":"Preto"}'::jsonb,
        updated_at = NOW()
      WHERE id = 'f6ee0b3a-8fd4-41b2-a827-6cc051890b1f';
    

      UPDATE public.product_variations
      SET 
        attributes = '{"0":{"name":"Cor","value":"Branco"},"Cor":"Branco"}'::jsonb,
        updated_at = NOW()
      WHERE id = 'd6743a5d-def5-4e12-bc3e-a58b7bdf5fc4';
    

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Móveis Sul","Altura":"190","Largura":"123","Profundidade":"50","Tipo de portas":"Bater","Material da estrutura":"MDP","Modelo":"Sophia","Quantidade de portas":"4 portas","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '190'),
      width = COALESCE(NULLIF(width, '0'), '123'),
      depth = COALESCE(NULLIF(depth, '0'), '50'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Sul' ELSE brand END,
      updated_at = NOW()
    WHERE id = '999e41ef-8d32-4cc9-8cb4-e36cbc9e52fa';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Moval","Altura":"230","Largura":"176","Profundidade":"52","Possui espelho":"Sim","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Califórnia","Quantidade de gavetas":"3 gavetas"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '230'),
      width = COALESCE(NULLIF(width, '0'), '176'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Moval' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'da424efe-36d5-4124-8f4b-a4a86f80698e';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Maxel","Modelo":"San Marino","Altura":"200","Largura":"157","Profundidade":"47","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '157'),
      depth = COALESCE(NULLIF(depth, '0'), '47'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Maxel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'd9fc6812-6487-4bb0-b062-5106da8ac7d5';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"235","Largura":"275","Profundidade":"63.5","Possui espelho":"Sim","Tipo de portas":"Correr","Quantidade de portas":"3 portas","Material da estrutura":"100% MDF","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Europa","Modelo":"Vitória","Quantidade de gavetas":"6 gavetas","Peso":"255","Material do cabideiro":"Alumínio"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '235'),
      width = COALESCE(NULLIF(width, '0'), '275'),
      depth = COALESCE(NULLIF(depth, '0'), '63.5'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Europa' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'a889a36b-8aa5-4b28-9063-462d8c10dd63';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"120","Largura":"136","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Faimec","Modelo":"Vegas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '120'),
      width = COALESCE(NULLIF(width, '0'), '136'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '75d0d942-7441-4b60-b898-cc17f971aefa';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Darmovel","Altura":"81.5","Largura":"120","Profundidade":"51","Tipo de portas":"Bater","Material da estrutura":"MDP","Modelo":"Pop","Quantidade de portas":"2 portas","Quantidade de gavetas":"3 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Acompanha tampo":"Não","Acompanha pia / cuba":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '81.5'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '51'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Darmovel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'bb75757c-19ce-44b1-8af5-705746fb1cb9';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"JK","Tipo de portas":"Bater","Quantidade de portas":"9 portas","Material da estrutura":"MDP","Quantidade de gavetas":"3 gavetas","Modelo":"JK Modulada","Altura":"200","Largura":"200","Profundidade":"52.5","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '200'),
      depth = COALESCE(NULLIF(depth, '0'), '52.5'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'JK' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'b4dc0852-40c5-414f-ac66-4adf5f650795';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"200","Largura":"206","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Doripel","Modelo":"Las Vegas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '200'),
      width = COALESCE(NULLIF(width, '0'), '206'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Doripel' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'c4b13f75-9c37-45a2-b674-4a582b65948c';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Marca":"Mopar","Altura":"108","Largura":"132.4","Profundidade":"45","Tipo de portas":"Bater","Quantidade de portas":"2 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"5 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Modelo":"Texas","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '108'),
      width = COALESCE(NULLIF(width, '0'), '132.4'),
      depth = COALESCE(NULLIF(depth, '0'), '45'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Mopar' ELSE brand END,
      updated_at = NOW()
    WHERE id = '3c42542e-8623-4055-aae4-9091dcf7b356';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"235","Largura":"226","Profundidade":"56","Possui espelho":"Sim","Tipo de portas":"Correr","Material da estrutura":"100% MDF","Quantidade de gavetas":"6 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Móveis Europa","Modelo":"Bragança","Quantidade de portas":"3 portas","Material do cabideiro":"Alumínio"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '235'),
      width = COALESCE(NULLIF(width, '0'), '226'),
      depth = COALESCE(NULLIF(depth, '0'), '56'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Móveis Europa' ELSE brand END,
      updated_at = NOW()
    WHERE id = '0d5ec9bf-db88-4e26-8198-7d4f2e13ef3a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"212.4","Largura":"229.5","Profundidade":"52.5","Tipo de portas":"Bater","Quantidade de portas":"9 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Aramóveis","Modelo":"Catarina"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '212.4'),
      width = COALESCE(NULLIF(width, '0'), '229.5'),
      depth = COALESCE(NULLIF(depth, '0'), '52.5'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = '3f279613-d469-4348-b433-5db0ff3852cd';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Largura":"200","Profundidade":"53","Tipo de portas":"Bater","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Indekes","Modelo":"Star","Altura":"217","Quantidade de portas":"10 portas","Peso":"151.8"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '217'),
      width = COALESCE(NULLIF(width, '0'), '200'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Indekes' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'afd21b58-8f80-4869-9997-8fae7a1aa5fc';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"194","Largura":"189","Profundidade":"53","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDP","Quantidade de gavetas":"1 gaveta","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Cadorin","Modelo":"Curitiba"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '194'),
      width = COALESCE(NULLIF(width, '0'), '189'),
      depth = COALESCE(NULLIF(depth, '0'), '53'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Cadorin' ELSE brand END,
      updated_at = NOW()
    WHERE id = 'fc1b3360-91f4-4b66-a85e-582bafcc408d';
  

      DELETE FROM public.product_categories 
      WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = '1859e792-0790-4554-b269-e3b0b707896e';

      INSERT INTO public.product_categories (product_id, category_id)
      SELECT '12d381a7-236f-46cc-bcb3-70bf167cde2a'::uuid, 'b3a1a235-fd4c-4706-a058-6f8200b3731a'::uuid
      WHERE NOT EXISTS (
        SELECT 1 FROM public.product_categories 
        WHERE product_id = '12d381a7-236f-46cc-bcb3-70bf167cde2a' AND category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a'
      );
    

    UPDATE public.products
    SET 
      
      category_id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a',
    
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Tipo de portas":"Bater + Basculante","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Marca":"MGM","Modelo":"Divina","Altura":"223.5","Largura":"270","Profundidade":"52","Quantidade de portas":"12 portas","Tipo/material da corrediça":"Corrediça metálica simples"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '223.5'),
      width = COALESCE(NULLIF(width, '0'), '270'),
      depth = COALESCE(NULLIF(depth, '0'), '52'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'MGM' ELSE brand END,
      updated_at = NOW()
    WHERE id = '12d381a7-236f-46cc-bcb3-70bf167cde2a';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"45","Largura":"120","Profundidade":"205","Tipo de portas":"Bater","Quantidade de portas":"4 portas","Material da estrutura":"MDP","Quantidade de gavetas":"2 gavetas","Tipo/material da corrediça":"Corrediça metálica simples","Marca":"Faimec","Modelo":"Curitiba","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '45'),
      width = COALESCE(NULLIF(width, '0'), '120'),
      depth = COALESCE(NULLIF(depth, '0'), '205'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Faimec' ELSE brand END,
      updated_at = NOW()
    WHERE id = '1ec6b9fb-60a2-49eb-b63b-71e99975aeda';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"97.3","Largura":"110.4","Profundidade":"46.8","Tipo de portas":"Bater","Quantidade de portas":"1 porta","Material da estrutura":"MDP/Vidro","Quantidade de gavetas":"5 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Aramóveis","Modelo":"5","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '97.3'),
      width = COALESCE(NULLIF(width, '0'), '110.4'),
      depth = COALESCE(NULLIF(depth, '0'), '46.8'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Aramóveis' ELSE brand END,
      updated_at = NOW()
    WHERE id = '849625c4-2015-4574-a28e-d61d6fd83786';
  

    UPDATE public.products
    SET 
      
      technical_specs = jsonb_set(
        COALESCE(technical_specs, '{}'::jsonb),
        '{technicalValues}',
        '{"Cor":null,"Altura":"230.5","Largura":"262","Profundidade":"54","Tipo de portas":"Bater","Quantidade de portas":"6 portas","Material da estrutura":"MDF/MDP","Quantidade de gavetas":"4 gavetas","Tipo/material da corrediça":"Corrediça telescópica","Marca":"Henn","Modelo":"Americano","Possui espelho":"Não"}'::jsonb,
        true
      ),
      height = COALESCE(NULLIF(height, '0'), '230.5'),
      width = COALESCE(NULLIF(width, '0'), '262'),
      depth = COALESCE(NULLIF(depth, '0'), '54'),
      brand = CASE WHEN brand IS NULL OR brand = '' OR brand = 'Não se aplica' THEN 'Henn' ELSE brand END,
      updated_at = NOW()
    WHERE id = '07bcb313-6650-4bc5-9d60-6e513c08da31';
  
COMMIT;