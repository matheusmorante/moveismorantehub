import { GET } from '../src/app/api/facebook-catalog.csv/route'

async function run() {
  const req = new Request('http://localhost:3000/api/facebook-catalog.csv')
  const res = await GET(req)
  const text = await res.text()
  
  const lines = text.split('\n')
  
  // Acha a linha que contém o ID do produto
  // ID do produto: aea7f3a0-44dc-49e6-87aa-2b6c8ebe3340
  const targetId = 'aea7f3a0-44dc-49e6-87aa-2b6c8ebe3340'
  
  // Como o CSV tem campos com quebra de linha envolvidos em aspas, split('\n') pode cortar no meio de um campo.
  // Vamos fazer um parser CSV simples ou apenas buscar no texto completo.
  // Vamos usar regex para encontrar a linha do ID.
  const regex = new RegExp(`(^|\\n)${targetId},.*`, 'g')
  const match = text.match(regex)
  
  if (match) {
    console.log("Linha completa encontrada:")
    console.log(match[0])
    
    // Vamos fazer split por vírgula mas respeitando aspas
    // Um split simples por vírgula que não esteja dentro de aspas
    const parts = match[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
    console.log("ID:", parts[0])
    console.log("Title:", parts[1])
    console.log("Link:", parts[3])
    console.log("Image Link (Foto 1):", parts[4])
    console.log("Additional Image Links:", parts[5])
  } else {
    console.log("Produto não encontrado no CSV")
  }
}

run()
