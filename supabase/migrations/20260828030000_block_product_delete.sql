-- Função para bloquear exclusão física de produtos
CREATE OR REPLACE FUNCTION block_product_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Não é permitido excluir produtos do banco de dados para preservar o histórico. Utilize o campo active como false para desativar o produto.';
END;
$$ LANGUAGE plpgsql;

-- Trigger para aplicar a regra antes de qualquer DELETE na tabela products
CREATE OR REPLACE TRIGGER trigger_block_product_delete
BEFORE DELETE ON products
FOR EACH ROW
EXECUTE FUNCTION block_product_delete();
