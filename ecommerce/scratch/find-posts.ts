import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('activePost') || line.includes('posts') || line.includes('loadPost') || line.includes('savePost')) {
    if (line.includes('const') || line.includes('function') || line.includes('setState') || line.includes('supabase') || line.includes('select') || line.includes('insert')) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
