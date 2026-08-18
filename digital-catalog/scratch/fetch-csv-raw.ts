import fetch from 'node-fetch'

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/facebook-catalog.csv')
    const text = await res.text()
    
    // Imprime as primeiras 5000 letras do CSV
    console.log("=== CSV BRUTO ===")
    console.log(text.slice(0, 5000))
  } catch (err: any) {
    console.error("Erro ao fazer fetch do CSV:", err.message)
  }
}

test()
