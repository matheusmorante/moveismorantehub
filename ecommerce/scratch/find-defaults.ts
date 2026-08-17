import * as fs from 'fs'
import * as path from 'path'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

// Vamos buscar por padrões ou funções que lidam com salvamento de valores padrões ou reset
const lines = content.split('\n')
console.log("Total de linhas:", lines.length)

// Procura por termos como "save", "default", "global", "reset" na página
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('default') || 
      line.toLowerCase().includes('reset') || 
      line.toLowerCase().includes('verde') ||
      line.toLowerCase().includes('padrao') ||
      line.toLowerCase().includes('green') ||
      line.toLowerCase().includes('global')) {
    // Apenas imprime se for interessante (ex: se tiver funções ou definições de estados)
    if (line.includes('const') || line.includes('function') || line.includes('let') || line.includes('=>') || line.includes('button') || line.includes('click') || line.includes('save') || line.includes('db') || line.includes('supabase')) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
