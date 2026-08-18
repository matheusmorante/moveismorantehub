import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('save') || line.includes('Salvar') || line.includes('submit') || line.includes('handleSave')) {
    if (line.includes('const') || line.includes('function') || line.includes('=>')) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
