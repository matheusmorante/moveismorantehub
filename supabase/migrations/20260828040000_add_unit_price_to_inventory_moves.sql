-- Adicionar coluna unit_price se não existir na tabela inventory_moves
ALTER TABLE inventory_moves ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

-- Função para calcular e retornar o unit_cost de uma saída com base nas entradas anteriores (média) ou na entrada posterior mais próxima
CREATE OR REPLACE FUNCTION calculate_withdrawal_unit_cost(p_product_id UUID, p_variation_id UUID, p_date TIMESTAMPTZ)
RETURNS NUMERIC AS $$
DECLARE
  v_avg_cost NUMERIC;
  v_next_cost NUMERIC;
BEGIN
  -- 1. Calcular a média das entradas anteriores
  IF p_variation_id IS NOT NULL THEN
    SELECT AVG(unit_cost) INTO v_avg_cost
    FROM inventory_moves
    WHERE product_id = p_product_id
      AND variation_id = p_variation_id
      AND type = 'entry'
      AND date < p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0;
  ELSE
    SELECT AVG(unit_cost) INTO v_avg_cost
    FROM inventory_moves
    WHERE product_id = p_product_id
      AND variation_id IS NULL
      AND type = 'entry'
      AND date < p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0;
  END IF;

  -- 2. Se houver média de entradas anteriores, retornar
  IF v_avg_cost IS NOT NULL AND v_avg_cost > 0 THEN
    RETURN ROUND(v_avg_cost, 2);
  END IF;

  -- 3. Caso contrário, buscar o custo unitário da primeira entrada posterior mais próxima
  IF p_variation_id IS NOT NULL THEN
    SELECT unit_cost INTO v_next_cost
    FROM inventory_moves
    WHERE product_id = p_product_id
      AND variation_id = p_variation_id
      AND type = 'entry'
      AND date >= p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0
    ORDER BY date ASC
    LIMIT 1;
  ELSE
    SELECT unit_cost INTO v_next_cost
    FROM inventory_moves
    WHERE product_id = p_product_id
      AND variation_id IS NULL
      AND type = 'entry'
      AND date >= p_date
      AND unit_cost IS NOT NULL AND unit_cost > 0
    ORDER BY date ASC
    LIMIT 1;
  END IF;

  RETURN COALESCE(ROUND(v_next_cost, 2), 0);
END;
$$ LANGUAGE plpgsql;

-- Função principal do trigger BEFORE INSERT OR UPDATE ON inventory_moves
CREATE OR REPLACE FUNCTION trigger_inventory_moves_before()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for uma saída (withdrawal), preenche o custo unitário automaticamente
  IF NEW.type = 'withdrawal' THEN
    NEW.unit_cost := calculate_withdrawal_unit_cost(NEW.product_id, NEW.variation_id, NEW.date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Configuração do trigger BEFORE
DROP TRIGGER IF EXISTS trg_inventory_moves_before ON inventory_moves;
CREATE TRIGGER trg_inventory_moves_before
BEFORE INSERT OR UPDATE ON inventory_moves
FOR EACH ROW
EXECUTE FUNCTION trigger_inventory_moves_before();

-- Função do trigger AFTER para recalcular saídas futuras quando houver novas entradas retroativas ou alterações de custos de entradas
CREATE OR REPLACE FUNCTION trigger_inventory_moves_after()
RETURNS TRIGGER AS $$
DECLARE
  v_prod_id UUID;
  v_var_id UUID;
  v_date TIMESTAMPTZ;
  r RECORD;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_prod_id := OLD.product_id;
    v_var_id := OLD.variation_id;
    v_date := OLD.date;
  ELSE
    v_prod_id := NEW.product_id;
    v_var_id := NEW.variation_id;
    v_date := NEW.date;
  END IF;

  -- Apenas recalcular saídas se a alteração ocorreu em uma entrada (entry)
  IF TG_OP = 'DELETE' AND OLD.type <> 'entry' THEN
    RETURN NULL;
  END IF;
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.type <> 'entry' THEN
    IF TG_OP = 'UPDATE' AND OLD.type <> 'entry' THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Atualizar custos unitários de todas as saídas ocorridas na mesma data ou posteriormente
  IF v_var_id IS NOT NULL THEN
    FOR r IN 
      SELECT id, product_id, variation_id, date 
      FROM inventory_moves 
      WHERE product_id = v_prod_id 
        AND variation_id = v_var_id 
        AND type = 'withdrawal' 
        AND date >= v_date
    LOOP
      UPDATE inventory_moves 
      SET unit_cost = calculate_withdrawal_unit_cost(r.product_id, r.variation_id, r.date)
      WHERE id = r.id;
    END LOOP;
  ELSE
    FOR r IN 
      SELECT id, product_id, variation_id, date 
      FROM inventory_moves 
      WHERE product_id = v_prod_id 
        AND variation_id IS NULL 
        AND type = 'withdrawal' 
        AND date >= v_date
    LOOP
      UPDATE inventory_moves 
      SET unit_cost = calculate_withdrawal_unit_cost(r.product_id, r.variation_id, r.date)
      WHERE id = r.id;
    END LOOP;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Configuração do trigger AFTER
DROP TRIGGER IF EXISTS trg_inventory_moves_after ON inventory_moves;
CREATE TRIGGER trg_inventory_moves_after
AFTER INSERT OR UPDATE OR DELETE ON inventory_moves
FOR EACH ROW
EXECUTE FUNCTION trigger_inventory_moves_after();
