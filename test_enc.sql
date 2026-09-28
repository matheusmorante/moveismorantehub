
WITH tmp AS (
  SELECT '98c31e61-d706-4a48-a48b-5890861534c3'::uuid as id, '[teste_aut]_draft_1789501856871 Guarda-Roupa Fênix Draft' as name
)
SELECT p.name as db_name, t.name as temp_name, p.name = t.name as is_equal
FROM products p JOIN tmp t ON p.id = t.id;
