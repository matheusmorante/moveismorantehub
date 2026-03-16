$envFile = "erp/.env"
$url = ""
$key = ""

Get-Content $envFile | ForEach-Object {
    if ($_ -match "VITE_SUPABASE_URL=(.*)") { $url = $matches[1] }
    if ($_ -match "VITE_SUPABASE_ANON_KEY=(.*)") { $key = $matches[1] }
}

$sql = "ALTER TABLE products ADD COLUMN IF NOT EXISTS extra_dimensions JSONB DEFAULT '[]'::jsonb; NOTIFY pgrst, 'reload schema';"
$body = @{ sql_query = $sql } | ConvertTo-Json

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "$url/rest/v1/rpc/execute_sql" -Method Post -Headers $headers -Body $body
