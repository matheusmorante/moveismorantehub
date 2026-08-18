import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('marketingDefaults') && line.includes('=')) {
    // Apenas se não for const d = marketingDefaults ou setMarketingDefaults
    if (!line.includes('const d') && !line.includes('setMarketingDefaults') && !line.includes('const [') && !line.includes('===') && !line.includes('==') && !line.includes('!==')) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
