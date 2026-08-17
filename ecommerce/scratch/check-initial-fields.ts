import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

let inNewPost = false
let newPostCode = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.includes('const handleNewPost = () =>')) {
    inNewPost = true
  }
  if (inNewPost) {
    newPostCode.push(`${i + 1}: ${line}`)
    if (line.trim() === '}' && !lines[i-1].includes('=>') && !lines[i-1].includes('{')) {
      // Deixa capturar até o final da função
      if (newPostCode.length > 50) {
        break
      }
    }
  }
}

console.log("=== HANDLE NEW POST CODE ===")
console.log(newPostCode.slice(0, 100).join('\n'))
