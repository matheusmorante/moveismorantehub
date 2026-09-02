param(
    [string]$ContainerName = 'supabase_db_morantehub'
)

$schemaPath = Join-Path $PSScriptRoot 'schema-base.sql'

if (-not (Test-Path -LiteralPath $schemaPath)) {
    throw "Snapshot-base não encontrado: $schemaPath"
}

& docker inspect $ContainerName *> $null
if ($LASTEXITCODE -ne 0) {
    throw "Container local não encontrado: $ContainerName"
}

& docker cp $schemaPath "${ContainerName}:/tmp/morantehub_schema_base.sql"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível copiar o snapshot para o Docker local.' }

& docker exec $ContainerName psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c 'DROP SCHEMA public CASCADE;'
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível limpar o schema público local.' }

& docker exec $ContainerName psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f /tmp/morantehub_schema_base.sql
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível restaurar o snapshot-base local.' }

Write-Host 'Banco local restaurado com o schema-base vazio.'
