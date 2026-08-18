import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Lê o arquivo .env.local manualmente para garantir que carregue as chaves
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
  console.log("Iniciando verificação de dados de marketing...")
  
  // 1. Verificando o marketing_defaults atual no banco
  const { data: styleSettings, error: styleErr } = await supabase
    .from("store_style_settings")
    .select("marketing_defaults")
    .eq("id", true)
    .maybeSingle()

  if (styleErr) {
    console.error("Erro ao ler store_style_settings:", styleErr)
  } else {
    console.log("marketing_defaults atual no banco:")
    console.dir(styleSettings?.marketing_defaults, { depth: null })
  }

  // 2. Verificando todos os produtos e seus posts
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .select("id, name, technical_specs")

  if (prodErr) {
    console.error("Erro ao ler produtos:", prodErr)
  } else {
    console.log("\nLista de produtos com posts salvos:")
    products?.forEach(p => {
      const posts = (p.technical_specs as any)?.posts || []
      if (posts.length > 0) {
        console.log(`- Produto: ${p.name} (${p.id})`)
        console.log(`  Qtd de posts: ${posts.length}`)
        posts.forEach((post: any) => {
          console.log(`    * Post ID: ${post.id}`)
          console.log(`      Settings:`, post.settings)
        })
      }
    })
  }
}

run()
