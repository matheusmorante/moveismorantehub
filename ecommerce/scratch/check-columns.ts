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
    .from("store_style_settings")
    .select("*")
    .limit(1)

  if (error) {
    console.error("Erro ao ler store_style_settings:", error)
  } else {
    console.log("Colunas e dados de store_style_settings:")
    console.dir(data, { depth: null })
  }
}

run()
