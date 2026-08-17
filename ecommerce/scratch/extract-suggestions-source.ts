import { execSync } from 'child_process'

try {
  const fileContent = execSync('git show HEAD~1:src/features/products/components/product-filter.tsx', { encoding: 'utf-8' })
  const lines = fileContent.split('\n')
  
  // Imprime trechos que contêm "suggestions"
  console.log("=== LÓGICA DE SUGESTÕES DO COMMIT ANTERIOR ===")
  lines.forEach((line, idx) => {
    if (line.includes('suggestions') || line.includes('Suggestions') || line.includes('fetchSuggestions')) {
      console.log(`${idx + 1}: ${line}`)
    }
  })
} catch (err: any) {
  console.error("Erro ao ler o git show:", err.message)
}
