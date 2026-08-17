import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('global_description_prefix') || line.includes('globalDescriptionPrefix')) {
    console.log(`Linha ${index + 1}: ${line.trim()}`)
  }
})
