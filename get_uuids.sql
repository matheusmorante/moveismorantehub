-- Gera os UUIDs exatos para o script de delete
SELECT id, code, name FROM products 
WHERE code IN ('000001', 'ORIG', 'TB4425', '003976') 
AND id != '78900c7a-0f8e-4f35-a3ce-894737f489bf'
ORDER BY code;