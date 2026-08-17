import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('selectedElement') && (line.includes('stroke') || line.includes('rect') || line.includes('draw') || line.includes('Border') || line.includes('box'))) {
    console.log(`Linha ${index + 1}: ${line.trim()}`)
  }
})
