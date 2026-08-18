import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('history') || line.includes('History') || line.includes('undo') || line.includes('redo')) {
    console.log(`Linha ${index + 1}: ${line.trim()}`)
  }
})
