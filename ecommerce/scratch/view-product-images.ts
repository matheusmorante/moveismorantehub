import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  console.log("Buscando imagens com 'fbcdn'...")
  
  const { data: images, error } = await supabase
    .from("product_images")
    .select("product_id, image_url, is_main")
    .ilike("image_url", "%fbcdn%")

  if (error) {
    console.error("Erro ao buscar imagens:", error)
  } else {
    console.log("Imagens do FB CDN encontradas:")
    console.dir(images, { depth: null })
  }
}

run()
