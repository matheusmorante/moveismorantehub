import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

lines.forEach((line, index) => {
  if (line.includes('oppScale') || line.includes('oppRotation') || line.includes('oppOffsetX') || line.includes('oppOffsetY')) {
    if (line.includes('<input') || line.includes('renderDualInput') || line.includes('renderDefaultPin') || line.includes('Slider') || line.includes('div') || line.includes('label')) {
      console.log(`Linha ${index + 1}: ${line.trim()}`)
    }
  }
})
