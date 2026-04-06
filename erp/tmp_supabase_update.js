const https = require('https');

const query = `
ALTER TABLE label_layouts 
ADD COLUMN IF NOT EXISTS margin_t FLOAT DEFAULT 8,
ADD COLUMN IF NOT EXISTS margin_b FLOAT DEFAULT 8,
ADD COLUMN IF NOT EXISTS margin_r FLOAT DEFAULT 9,
ADD COLUMN IF NOT EXISTS margin_l FLOAT DEFAULT 9,
ADD COLUMN IF NOT EXISTS gap_h FLOAT DEFAULT 10,
ADD COLUMN IF NOT EXISTS gap_v FLOAT DEFAULT 2,
ADD COLUMN IF NOT EXISTS image_fit TEXT DEFAULT 'contain',
ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS price_format TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS bg_color TEXT DEFAULT '#ffffff';
`;

// Note: Using the REST endpoint directly for SQL is not standard Supabase REST behavior 
// without a custom RPC function. Usually you use the SQL Editor.
// But we'll try to use the MCP server again but with a VERY clean project_id.

console.log('Query prepared for ASCII execution.');
console.log(query);
