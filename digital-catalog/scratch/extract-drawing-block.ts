import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

// Vamos imprimir as linhas em torno de 1312 e de 1777
console.log("=== INÍCIO DO BLOCO (1310 - 1320) ===")
for (let i = 1309; i < 1320; i++) {
  console.log(`${i + 1}: ${lines[i]}`)
}

console.log("\n=== FIM DO BLOCO (1770 - 1780) ===")
for (let i = 1769; i < 1780; i++) {
  console.log(`${i + 1}: ${lines[i]}`)
}
