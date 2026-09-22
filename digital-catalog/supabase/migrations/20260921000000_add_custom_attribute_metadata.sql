-- Expansão compatível e autossuficiente para o schema real legado.
-- A ordem é aditiva: nenhum dado existente é removido nesta etapa.
ALTER TABLE public.attributes
  ADD COLUMN IF NOT EXISTS data_type text NOT NULL DEFAULT 'list',
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

-- A coluna pode ter vindo de uma execução parcial anterior.
ALTER TABLE public.attributes
  ALTER COLUMN data_type SET DEFAULT 'list';

-- Backfill idempotente e conservador: nenhum registro existente é convertido em personalizado.
UPDATE public.attributes
SET is_custom = false
WHERE is_custom IS NULL;

COMMENT ON COLUMN public.attributes.is_custom IS
  'Indica se a característica foi criada pelo usuário após a introdução desta classificação.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attributes_data_type_check'
  ) THEN
    ALTER TABLE public.attributes
      ADD CONSTRAINT attributes_data_type_check CHECK (
        data_type IN ('text_short', 'text_long', 'text', 'integer', 'decimal', 'number', 'measure', 'radio', 'multi_select', 'list', 'boolean')
      ) NOT VALID;
  END IF;
END $$;
