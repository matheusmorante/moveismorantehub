const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('C:/Users/Rosilene/.gemini/antigravity/brain/267aea66-1826-44ee-96cd-378a4c517aa1/sql-cleanup-script.md', 'utf8');
const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/)[1];

const checkSql = `
${sqlMatch.split('DO $$')[0]}
CREATE TEMP TABLE tmp_garbage_products (id UUID PRIMARY KEY, name TEXT NOT NULL) ON COMMIT DROP;
INSERT INTO tmp_garbage_products (id, name) VALUES
${sqlMatch.split('INSERT INTO tmp_garbage_products (id, name) VALUES')[1].split(';')[0]};

SELECT 
  (SELECT COUNT(*) FROM tmp_garbage_products) as temp_count,
  (SELECT COUNT(*) FROM products p JOIN tmp_garbage_products t ON p.id = t.id) as id_match_count,
  (SELECT COUNT(*) FROM products p JOIN tmp_garbage_products t ON p.id = t.id WHERE p.name = t.name) as name_match_count;

SELECT p.name as db_name, t.name as temp_name
FROM products p JOIN tmp_garbage_products t ON p.id = t.id 
WHERE p.name != t.name;
COMMIT;
`;

fs.writeFileSync('test_counts.sql', checkSql);

try {
const out = execSync('npx supabase db query -f test_counts.sql --linked', { encoding: 'utf8' });
console.log(out);
} catch(e) { console.error(e.stdout); }
