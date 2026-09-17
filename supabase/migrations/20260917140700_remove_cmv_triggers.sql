-- Migration para remover triggers e função de recálculo mágico e errado de custo de estoque e CMV
-- As triggers tentavam fazer média simples e reescreviam saídas passadas baseando-se em eventos posteriores.

-- 1. Removemos as triggers de inventory_moves
DROP TRIGGER IF EXISTS trg_inventory_moves_after ON public.inventory_moves;
DROP TRIGGER IF EXISTS trg_inventory_moves_before ON public.inventory_moves;

-- 2. Removemos as funções chamadas por essas triggers
DROP FUNCTION IF EXISTS public.trigger_inventory_moves_after();
DROP FUNCTION IF EXISTS public.trigger_inventory_moves_before();

-- 3. Removemos as funções que calculavam e aplicavam custo médio de forma errada (média aritmética) 
-- e que previam o futuro buscando notas fiscais futuras para aplicar em saídas sem custo
DROP FUNCTION IF EXISTS public.calculate_withdrawal_unit_cost(text, text, timestamp with time zone);
DROP FUNCTION IF EXISTS public.calculate_withdrawal_unit_cost(uuid, uuid, timestamp with time zone);
