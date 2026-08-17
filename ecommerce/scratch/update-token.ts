import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const token = 'EAAWC7cBVUpgBSDurc1gqcg64lF8tz6BCx2a53zbtfVZCEXxLH9HZC2l8OnSlKDhiZAPQTGhYqzfaGvXCu7j4urtKpjtmTc1ziVYoKmwRL5fIjPspATqWlf99VFpSFPRb9pKDjAzdGI7E3dOwZBo3YleuWZAtu4UrZCz1aObOuPkPIvlSXx1Xjc0GeU9n9hTAZDZD'

  console.log("Atualizando meta_access_token em facebook_catalog_settings...")
  
  const { data, error } = await supabase
    .from("facebook_catalog_settings")
    .upsert({ 
      id: true, 
      meta_access_token: token 
    })
    .select()

  if (error) {
    console.error("Erro ao atualizar o token:", error)
  } else {
    console.log("Sucesso! Registro atualizado:", data)
  }
}

run()
