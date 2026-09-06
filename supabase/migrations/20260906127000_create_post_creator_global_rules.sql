CREATE TABLE IF NOT EXISTS public.post_creator_global_rules (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  guidelines text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_creator_global_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_manage_post_creator_global_rules" ON public.post_creator_global_rules;
CREATE POLICY "authenticated_manage_post_creator_global_rules" ON public.post_creator_global_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.post_creator_global_rules (id, guidelines)
VALUES (true, 'COMPOSIÇÃO GERAL\n- Preservar informações comerciais exatamente como fornecidas; preço, nome, parcelamento, logo e selo são renderizados deterministicamente.\n- Manter área comercial legível, sem sobrepor produto ou fotos.\n\nFOTOS DO PRODUTO\n- A variação principal usa FOTO 1 como PRIMARY: maior destaque visual.\n- A FOTO 2 da variação principal é SECONDARY: menor, próxima da foto principal e nunca uma duplicação da FOTO 1.\n- Cada outra variação usa somente sua FOTO 1 como miniatura representativa.\n- As fotos das outras variações devem ficar em galeria horizontal, em posição distinta da variação principal, dentro de borda branca fina e sem texto dentro das imagens.\n- Nunca misturar fotos de variações diferentes, inventar fotos ou criar espaços vazios quando uma foto não existir.\n\nPOSICIONAMENTO\n- Produto e preço recebem a maior prioridade.\n- Logo no topo, selo de oportunidade somente quando o produto possuir oportunidade, título/nome com alto contraste e CTA discreto.')
ON CONFLICT (id) DO NOTHING;
