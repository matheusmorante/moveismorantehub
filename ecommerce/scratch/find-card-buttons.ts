import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('Editar') && line.includes('Ver')) {
    console.log(`Linha ${index + 1}: ${line.trim()}`)
  } else if (line.includes('handleEditPost') || line.includes('handleDeletePost') || line.includes('Excluir')) {
    // Também procura em volta para ver o contexto
    if (line.includes('onClick=') && (line.includes('post') || line.includes('id'))) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
