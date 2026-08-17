import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

// Normaliza para LF para evitar diferenças de CRLF
const normalizedContent = content.replace(/\r\n/g, '\n')

const lines = normalizedContent.split('\n')

// Remove as linhas correspondentes ao primeiro catch redundante
// O primeiro catch fica logo acima de "Erro ao desenhar banner no canvas de forma síncrona"
// Vamos procurar a ocorrência de "Erro ao desenhar banner no canvas:" e remover seu bloco catch associado
let targetIndex = -1
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('console.error("Erro ao desenhar banner no canvas:", error)')) {
    targetIndex = i
    break
  }
}

if (targetIndex !== -1) {
  // O bloco do catch redundante geralmente é:
  // lines[targetIndex - 2] = ctx.textAlign = "left"
  // lines[targetIndex - 1] = } catch (error) {
  // lines[targetIndex] = console.error(...)
  // lines[targetIndex + 1] = }
  
  // Vamos apagar essas 4 linhas
  lines.splice(targetIndex - 2, 4)
  
  const updatedContent = lines.join('\n').replace(/\n/g, '\r\n')
  fs.writeFileSync(filePath, updatedContent, 'utf-8')
  console.log("Catch redundante removido com sucesso!")
} else {
  console.error("Erro: O catch redundante não foi encontrado!")
}
