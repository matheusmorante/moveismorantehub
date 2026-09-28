param(
  [string]$Workdir = (Join-Path $env:TEMP 'morantehub-local-tests-20260928')
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$workFull = [System.IO.Path]::GetFullPath($Workdir)
$tempFull = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
if (-not $workFull.StartsWith($tempFull, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Workdir must be under the system temporary directory.'
}

$projectId = 'morantehub-local-tests'
$dockerPath = 'C:\Program Files\Docker\Docker\resources\bin'
if (Test-Path (Join-Path $dockerPath 'docker.exe')) {
  $env:PATH = $dockerPath + ';' + $env:PATH
}
if (-not (Get-Command docker.exe -ErrorAction SilentlyContinue)) {
  throw 'Docker CLI is unavailable.'
}

$sourceSupabase = Join-Path $repoRoot 'supabase'
$targetSupabase = Join-Path $workFull 'supabase'
$migrations = Join-Path $targetSupabase 'migrations'
$baseline = Join-Path $PSScriptRoot 'baseline'
New-Item -ItemType Directory -Force -Path $migrations,(Join-Path $targetSupabase 'functions'),(Join-Path $targetSupabase '.temp') | Out-Null

$generated = @(
  '20260902000000_local_schema_snapshot.sql',
  '20260902000001_local_suppliers_fixture.sql',
  '20260902000002_add_inventory_move_status_fixture.sql',
  '20260917140700_remove_cmv_triggers.sql',
  '20260927234535_add_product_kind.sql',
  '20260927235000_create_stock_unavailabilities.sql',
  '20260928002920_harden_stock_unavailabilities.sql'
)
$unexpected = Get-ChildItem $migrations -Filter '*.sql' -ErrorAction SilentlyContinue | Where-Object Name -NotIn $generated
if ($unexpected) { throw ('Unexpected migrations in isolated workdir: ' + (($unexpected | ForEach-Object Name) -join ', ')) }

foreach ($name in $generated[0..2]) {
  Copy-Item -LiteralPath (Join-Path $baseline $name) -Destination (Join-Path $migrations $name) -Force
}
foreach ($name in $generated[3..($generated.Count - 1)]) {
  $source = Join-Path $sourceSupabase ('migrations\' + $name)
  if (-not (Test-Path $source)) { throw "Required project migration is missing: $name" }
  Copy-Item -LiteralPath $source -Destination (Join-Path $migrations $name) -Force
}

$config = Get-Content (Join-Path $sourceSupabase 'config.toml')
$inSeed = $false
$inStudio = $false
$config = foreach ($line in $config) {
  if ($line -match '^\[db\.seed\]') { $inSeed = $true }
  elseif ($line -match '^\[') { $inSeed = $false }
  if ($line -match '^\[studio\]') { $inStudio = $true }
  elseif ($line -match '^\[') { $inStudio = $false }
  if ($line -match '^project_id\s*=') { $line = "project_id = `"$projectId`"" }
  if ($line -match '^health_timeout\s*=') { $line = 'health_timeout = "5m"' }
  if ($line -match '^port\s*=\s*54321$') { $line = 'port = 55321' }
  if ($line -match '^port\s*=\s*54322$') { $line = 'port = 55322' }
  if ($line -match '^port\s*=\s*54320$') { $line = 'port = 55320' }
  if ($line -match '^port\s*=\s*54329$') { $line = 'port = 55329' }
  if ($line -match '^port\s*=\s*54323$') { $line = 'port = 55323' }
  if ($line -match '^port\s*=\s*54324$') { $line = 'port = 55324' }
  if ($line -match '^port\s*=\s*54327$') { $line = 'port = 55327' }
  if ($inSeed -and $line -match '^enabled\s*=\s*true$') { $line = 'enabled = false' }
  if ($inStudio -and $line -match '^enabled\s*=\s*false$') { $line = 'enabled = true' }
  $line
}
Set-Content -LiteralPath (Join-Path $targetSupabase 'config.toml') -Value $config -Encoding utf8

# Copy only local service version pins; never copy linked project identity or credentials.
foreach ($name in @('gotrue-version','postgres-version','rest-version','storage-version','storage-migration')) {
  $pin = Join-Path $sourceSupabase ('.temp\' + $name)
  if (Test-Path $pin) { Copy-Item -LiteralPath $pin -Destination (Join-Path $targetSupabase ('.temp\' + $name)) -Force }
}
foreach ($name in @('linked-project.json','project-ref','pooler-url')) {
  $localOnly = Join-Path $targetSupabase ('.temp\' + $name)
  if (Test-Path -LiteralPath $localOnly -PathType Leaf) { Remove-Item -LiteralPath $localOnly -Force }
}

function Invoke-Supabase([string[]]$Arguments) {
  $captured = & npx.cmd supabase @Arguments --workdir $workFull 2>&1
  $exit = $LASTEXITCODE
  foreach ($line in $captured) {
    if ($line -notmatch 'ANON_KEY|SERVICE_ROLE_KEY|SECRET_KEY|JWT_SECRET|PUBLISHABLE_KEY|DB_URL|API_KEY|eyJ[a-zA-Z0-9_.-]+') { Write-Host $line }
  }
  if ($exit -ne 0) { throw ('Supabase CLI failed: ' + ($Arguments -join ' ')) }
}

$container = "supabase_db_$projectId"
function Invoke-LocalSql([string]$Sql) {
  $output = & docker.exe exec $container psql -U postgres -d postgres -v ON_ERROR_STOP=1 -Atc $Sql 2>&1
  if ($LASTEXITCODE -ne 0) { throw ('Local PostgreSQL assertion failed: ' + (($output | Select-Object -Last 1) -join '')) }
  return (($output | ForEach-Object { $_.ToString() }) -join "`n").Trim()
}
function Assert-EssentialSchema([string]$Phase) {
  $result = Invoke-LocalSql "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('products','product_variations','profiles','stock_unavailabilities');"
  if ($result -ne '4') { throw "${Phase}: expected all 4 essential tables; found $result." }
  $bucket = Invoke-LocalSql "SELECT public::text FROM storage.buckets WHERE id='unavailabilities';"
  if ($bucket -ne 'false') { throw "${Phase}: unavailabilities bucket is not private." }
  Write-Host "PASS ${Phase}: products, product_variations, profiles, stock_unavailabilities and private bucket exist."
}

Invoke-Supabase @('start')
Invoke-Supabase @('db','reset','--local','--no-seed')
Assert-EssentialSchema 'clean reset'
Invoke-Supabase @('stop')
Invoke-Supabase @('start')
Assert-EssentialSchema 'stop/start restore'

$harden = Join-Path $migrations $generated[-1]
$held = Join-Path $workFull 'harden-upgrade-stage.sql'
$run = 'TEST_AUT_UPGRADE_' + [guid]::NewGuid().ToString('N')
$productId = $null
$variationId = $null
$unavailabilityId = $null
try {
  Move-Item -LiteralPath $harden -Destination $held
  Invoke-Supabase @('db','reset','--local','--no-seed')
  Assert-EssentialSchema 'pre-upgrade schema'
  $productId = [regex]::Match((Invoke-LocalSql "INSERT INTO public.products(name,slug,price,product_kind,active,status) VALUES ('$run','$run',1,'normal',true,true) RETURNING id;"), '[0-9a-f]{8}-[0-9a-f-]{27,}').Value
  $variationId = [regex]::Match((Invoke-LocalSql "INSERT INTO public.product_variations(product_id,name,sku,stock,attributes) VALUES ('$productId','$run','$run',5,'{}') RETURNING id;"), '[0-9a-f]{8}-[0-9a-f-]{27,}').Value
  $unavailabilityId = [regex]::Match((Invoke-LocalSql "INSERT INTO public.stock_unavailabilities(product_id,variation_id,quantity,reason,photos) VALUES ('$productId','$variationId',1,'$run',ARRAY['https://local.test/storage/v1/object/public/unavailabilities/$run.jpg']) RETURNING id;"), '[0-9a-f]{8}-[0-9a-f-]{27,}').Value
  if (-not $productId -or -not $variationId -or -not $unavailabilityId) { throw 'Could not create the owned upgrade fixture.' }
  Move-Item -LiteralPath $held -Destination $harden
  Invoke-Supabase @('migration','up','--local')
  $upgraded = Invoke-LocalSql "SELECT photos[1]||'|'||(SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_unavailabilities' AND column_name='variation_id')||'|'||(SELECT public::text FROM storage.buckets WHERE id='unavailabilities') FROM public.stock_unavailabilities WHERE id='$unavailabilityId';"
  if ($upgraded -ne "$run.jpg|NO|false") { throw "Upgrade assertion failed: $upgraded" }
  Write-Host 'PASS representative upgrade: legacy photo URL converted to object key, variation_id is required, bucket is private.'
}
finally {
  if ((Test-Path $held) -and -not (Test-Path $harden)) { Move-Item -LiteralPath $held -Destination $harden }
  if ($unavailabilityId) { [void](Invoke-LocalSql "DELETE FROM public.stock_unavailabilities WHERE id='$unavailabilityId';") }
  if ($productId -and $variationId) {
    [void](Invoke-LocalSql "SET session_replication_role=replica; DELETE FROM public.product_variations WHERE id='$variationId'; DELETE FROM public.products WHERE id='$productId'; SET session_replication_role=origin;")
  }
}
Assert-EssentialSchema 'final upgraded schema'
Write-Host "PASS cleanup: test fixture $run removed. Stack remains local on API 55321 and DB 55322."
