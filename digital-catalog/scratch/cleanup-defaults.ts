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
  console.log("Limpando a chave 'productTitle' do marketing_defaults...")
  
  const { data: fbSettings, error: readErr } = await supabase
    .from("facebook_catalog_settings")
    .select("column_mappings")
    .eq("id", true)
    .maybeSingle()

  if (readErr) {
    console.error("Erro ao ler facebook_catalog_settings:", readErr)
    return
  }

  const currentMappings = fbSettings?.column_mappings && typeof fbSettings.column_mappings === "object"
    ? fbSettings.column_mappings as any
    : {}

  if (currentMappings.marketing_defaults) {
    delete currentMappings.marketing_defaults.productTitle
    
    const { error: writeErr } = await supabase
      .from("facebook_catalog_settings")
      .upsert({ id: true, column_mappings: currentMappings })

    if (writeErr) {
      console.error("Erro ao salvar facebook_catalog_settings:", writeErr)
    } else {
      console.log("Chave 'productTitle' removida com sucesso de marketing_defaults no banco de dados!")
    }
  } else {
    console.log("marketing_defaults não encontrado no banco de dados.")
  }
}

run()
