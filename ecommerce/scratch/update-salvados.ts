import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkoxhourxwlddgsfdgws.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
  const text = `ESSE PRODUTO É DO LOTE DOS SALVADOS, QUE SÃO MÓVEIS DE CAIXA BATIDA, ULTIMO DE MOSTRUÁRIO OU QUE FORAM MONTADO ERRADO, POR ISSO PODE CONTER AVARIAS, QUE SÃO MOSTRADAS NAS ULTIMAS IMAGENS DO CARROCEL DE IMAGEM DO PRODUTO ACIMA, E O PREÇO É SUPER REDUZIDO. SALVADOS GERALMENTE VENDE RAPIDO APROVEITE ANTES QUE ESGOTE!`

  console.log("Atualizando oportunidade 'salvados'...")
  
  // Vamos atualizar tanto o slug 'salvados' quanto 'salvado' para garantir
  const { data, error } = await supabase
    .from("opportunities")
    .update({ observations: text })
    .or("slug.eq.salvados,slug.eq.salvado")
    .select()

  if (error) {
    console.error("Erro ao atualizar:", error)
  } else {
    console.log("Sucesso! Registro(s) atualizado(s):", data)
  }
}

run()
