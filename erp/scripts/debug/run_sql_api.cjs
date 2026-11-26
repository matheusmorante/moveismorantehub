const ref = 'hkoxhourxwlddgsfdgws';
const token = process.env.SUPABASE_ACCESS_TOKEN || 'YOUR_TOKEN_HERE';
const sql = `UPDATE public.categories SET name = 'Cozinhas Moduladas e Compactas' WHERE id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a' OR name = 'Jogo de Cozinha';`;

fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
})
.then(res => res.json())
.then(data => {
    console.log("Response:", data);
})
.catch(err => {
    console.error("Error:", err);
});
