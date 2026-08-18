import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    const val = parts.slice(1).join('=').trim()
    env[key] = val
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || 'https://hkoxhourxwlddgsfdgws.supabase.co'
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const { data, error } = await supabase
    .rpc("get_tables") // Tenta RPC se existir, senão faz query SQL direta via postgres se possível, ou vamos consultar o schema via catalog
  
  // Vamos rodar uma query SQL direta usando a API REST do postgrest que permite ler o schema
  // ou podemos usar a API de swagger / rest do supabase que fica no path /rest/v1/
  // Mas a forma mais garantida é tentar ler de tabelas comuns como facebook_catalog_settings, store_settings ou afins
  console.log("Tentando ler facebook_catalog_settings...")
  const { data: fbData, error: fbErr } = await supabase
    .from("facebook_catalog_settings")
    .select("*")
    .limit(1)
  
  if (fbErr) {
    console.error("Erro facebook_catalog_settings:", fbErr)
  } else {
    console.log("facebook_catalog_settings:", fbData)
  }

  console.log("Tentando consultar tabelas do Postgres via SQL query...")
  // Para rodar SQL, se não tiver RPC, podemos tentar ler a tabela de schema information_schema.columns
  // Embora o Postgrest bloqueie queries diretas a information_schema a menos que esteja exposto, vamos testar:
  const { data: cols, error: colsErr } = await supabase
    .from("store_style_settings")
    .select("*")
  
  console.log("store_style_settings completo:", cols)
}

run()
