-- ==============================================================================
-- Migration: 20261002223000_audit_and_enrich_category_attributes.sql
-- Descrição: Auditoria completa e enriquecimento de vínculos de características
--            em categorias órfãs (Cozinha, Quarto, Sala de Estar, Escritório,
--            Banheiro, Lavanderia) e preenchimento de características essenciais
--            faltantes (LED em penteadeiras/cristaleiras/cabeceiras, passa fios
--            em mesas de escritório, nichos em estantes/buffets, etc.).
-- ==============================================================================

DO $$
BEGIN

  -- ============================================================================
  -- 1. ENRIQUECIMENTO DAS 6 CATEGORIAS MACRO DE AMBIENTES (QUE ESTAVAM SEM ATRIBUTOS)
  -- ============================================================================

  -- 1.1 Cozinha
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cozinha'
    AND a.name IN (
      'Acabamento', 'Altura', 'Cor', 'Espessura do MDF/MDP', 'Largura', 'Linha',
      'Marca', 'Material da estrutura', 'Material das portas', 'Material das prateleiras',
      'Material do fundo', 'Material dos pés', 'Material dos puxadores', 'Modelo',
      'Pés reguláveis', 'Peso', 'Peso suportado por prateleira', 'Profundidade',
      'Quantidade de gavetas', 'Quantidade de portas', 'Quantidade de prateleiras',
      'Rodízios', 'Slow motion / Fechamento suave', 'Tipo de portas', 'Tipo de puxador',
      'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 1.2 Quarto
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Quarto'
    AND a.name IN (
      'Acabamento', 'Acompanha colchão', 'Altura', 'Altura do espelho', 'Calceiro',
      'Comprimento do espelho', 'Cor', 'Densidade da Espuma', 'Divisão ele e ela',
      'Dupla face', 'Espessura do MDF/MDP', 'Firmeza', 'Largura', 'Largura do espelho',
      'Linha', 'Maleiro', 'Marca', 'Material da estrutura', 'Material das portas',
      'Material das prateleiras', 'Material do cabideiro', 'Material do fundo',
      'Material dos pés', 'Material dos puxadores', 'Modelo', 'Pés reguláveis',
      'Peso', 'Peso suportado', 'Peso suportado por prateleira', 'Pillow top',
      'Possui espelho', 'Possui LED', 'Profundidade', 'Quantidade de cabideiros',
      'Quantidade de espelhos', 'Quantidade de gavetas', 'Quantidade de portas',
      'Quantidade de prateleiras', 'Revestimento', 'Rodízios',
      'Slow motion / Fechamento suave', 'Tamanho do colchão', 'Tecido', 'Tipo de mola',
      'Tipo de portas', 'Tipo de puxador', 'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 1.3 Sala de Estar
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Sala de Estar'
    AND a.name IN (
      'Acabamento', 'Almofadas', 'Altura', 'Cor', 'Densidade da Espuma', 'Entrada USB',
      'Espessura do MDF/MDP', 'Largura', 'Linha', 'Marca', 'Material da estrutura',
      'Material das almofadas', 'Material das portas', 'Material das prateleiras',
      'Material do fundo', 'Material dos pés', 'Material dos puxadores', 'Modelo',
      'Passa fios', 'Pés reguláveis', 'Peso', 'Peso suportado',
      'Peso suportado por prateleira', 'Pillow top', 'Polegadas suportadas',
      'Possui espelho', 'Possui LED', 'Profundidade', 'Profundidade aberto',
      'Profundidade fechado', 'Quantidade de entradas USB', 'Quantidade de gavetas',
      'Quantidade de lugares', 'Quantidade de nichos', 'Quantidade de portas',
      'Quantidade de posições do reclinável', 'Quantidade de prateleiras', 'Reclinável',
      'Retrátil', 'Rodízios', 'Slow motion / Fechamento suave', 'Tecido', 'Tipo de mola',
      'Tipo de portas', 'Tipo de puxador', 'Tipo de sofá', 'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 1.4 Escritório
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Escritório'
    AND a.name IN (
      'Acabamento', 'Altura', 'Altura do assento ao chão', 'Cor', 'Densidade da Espuma',
      'Densidade do assento', 'Espessura do MDF/MDP', 'Largura', 'Linha', 'Marca',
      'Material da estrutura', 'Material das portas', 'Material das prateleiras',
      'Material do assento', 'Material do encosto', 'Material dos pés',
      'Material dos puxadores', 'Modelo', 'Passa fios', 'Pés reguláveis', 'Peso',
      'Peso suportado por cadeira', 'Peso suportado por prateleira', 'Profundidade',
      'Quantidade de gavetas', 'Quantidade de nichos', 'Quantidade de portas',
      'Quantidade de prateleiras', 'Rodízios', 'Slow motion / Fechamento suave',
      'Tecido', 'Tipo de portas', 'Tipo de puxador', 'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 1.5 Banheiro
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Banheiro'
    AND a.name IN (
      'Acabamento', 'Altura', 'Altura do espelho', 'Comprimento do espelho', 'Cor',
      'Espessura do MDF/MDP', 'Largura', 'Largura do espelho', 'Linha', 'Marca',
      'Material da estrutura', 'Material das portas', 'Material das prateleiras',
      'Material do fundo', 'Material dos pés', 'Material dos puxadores', 'Modelo',
      'Pés reguláveis', 'Peso', 'Possui espelho', 'Profundidade',
      'Quantidade de espelhos', 'Quantidade de gavetas', 'Quantidade de portas',
      'Quantidade de prateleiras', 'Slow motion / Fechamento suave', 'Tipo de portas',
      'Tipo de puxador', 'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 1.6 Lavanderia
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Lavanderia'
    AND a.name IN (
      'Acabamento', 'Altura', 'Cor', 'Espessura do MDF/MDP', 'Largura', 'Linha',
      'Marca', 'Material da estrutura', 'Material das portas', 'Material das prateleiras',
      'Material do fundo', 'Material dos pés', 'Material dos puxadores', 'Modelo',
      'Pés reguláveis', 'Peso', 'Peso suportado por prateleira', 'Profundidade',
      'Quantidade de gavetas', 'Quantidade de portas', 'Quantidade de prateleiras',
      'Rodízios', 'Slow motion / Fechamento suave', 'Tipo de portas', 'Tipo de puxador',
      'Tipo/material da corrediça'
    )
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- ============================================================================
  -- 2. ENRIQUECIMENTO DE CATEGORIAS ESPECÍFICAS
  -- ============================================================================

  -- 2.1 Penteadeiras: Adicionar Possui LED, Nichos, Prateleiras
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Penteadeiras'
    AND a.name IN ('Possui LED', 'Quantidade de nichos', 'Quantidade de prateleiras', 'Material das prateleiras')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.2 Mesas para Escritório: Adicionar Passa fios, Nichos, Material do fundo
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Mesas para Escritório'
    AND a.name IN ('Passa fios', 'Quantidade de nichos', 'Material do fundo')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.3 Cristaleiras: Adicionar Possui LED
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cristaleiras'
    AND a.name = 'Possui LED'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.4 Aparadores Buffets: Adicionar Possui LED e Quantidade de nichos
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Aparadores Buffets'
    AND a.name IN ('Possui LED', 'Quantidade de nichos')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.5 Estantes: Adicionar Quantidade de nichos, Passa fios, Possui LED, Rodízios
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Estantes'
    AND a.name IN ('Quantidade de nichos', 'Passa fios', 'Possui LED', 'Rodízios')
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.6 Painéis: Adicionar Material das portas
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Painéis'
    AND a.name = 'Material das portas'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.7 Pias: Adicionar Acabamento
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Pias'
    AND a.name = 'Acabamento'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.8 Guarda-Roupas: Adicionar Rodízios
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Guarda-Roupas'
    AND a.name = 'Rodízios'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

  -- 2.9 Cabeceiras: Adicionar Possui LED
  INSERT INTO category_attributes (attribute_id, category_id, is_required)
  SELECT a.id, c.id, false
  FROM attributes a
  CROSS JOIN categories c
  WHERE c.name = 'Cabeceiras'
    AND a.name = 'Possui LED'
  ON CONFLICT (attribute_id, category_id) DO NOTHING;

END $$;
