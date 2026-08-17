import * as fs from 'fs'
import * as path from 'path'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

// 1. Localiza a linha de início e fim do drawBannerAsync
let startIdx = -1
let endIdx = -1

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const drawBannerAsync = async (canvas: HTMLCanvasElement')) {
    startIdx = i
  }
  // Localiza a linha final que é } logo antes do comentário // Retorna as regiões de clique
  if (startIdx !== -1 && lines[i].includes('// Retorna as regiões de clique')) {
    // A linha final do drawBannerAsync é algumas linhas acima (geralmente a linha com })
    for (let j = i - 1; j > startIdx; j--) {
      if (lines[j].trim() === '}') {
        endIdx = j
        break
      }
    }
    break
  }
}

console.log(`Início: linha ${startIdx + 1}, Fim: linha ${endIdx + 1}`)

// Extrai o conteúdo do corpo do desenho original (da linha 1312 até a linha anterior a endIdx)
// Linha 1312 no arquivo original (index 1311) é onde começa o desenho.
// Vamos pegar as linhas do index 1311 até o endIdx
const drawingBodyLines = lines.slice(1311, endIdx)
const drawingBodyCode = drawingBodyLines.join('\n')

// Constrói a nova função drawBannerSync
const drawBannerSyncCode = `  // Desenho 100% síncrono do banner, sem NENHUM await ou promise, para rodar na mesma thread e eliminar lag
  const drawBannerSync = (
    canvas: HTMLCanvasElement,
    loadedImages: {
      headerBg: HTMLImageElement | null
      logo: HTMLImageElement | null
      mainImg: HTMLImageElement | null
      secImg: HTMLImageElement | null
    },
    isExport = false
  ) => {
    try {
      if (!activeProduct) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const S = canvas.width / 1080 // fator de escala (1 para 1080px, 420/1080 para preview)

      // Reseta as regiões renderizadas para recalcular as hitboxes neste frame
      renderedRegionsRef.current = {}
      const reg = renderedRegionsRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { headerBg, logo, mainImg, secImg } = loadedImages

${drawingBodyCode}
      
      ctx.textAlign = "left"
    } catch (error) {
      console.error("Erro ao desenhar banner no canvas de forma síncrona:", error)
    }
  }`

// Constrói a nova função drawBannerAsync
const drawBannerAsyncCode = `  // Função de desenho compartilhada entre preview e download (Assíncrona para pré-carregamento)
  const drawBannerAsync = async (canvas: HTMLCanvasElement, isExport = false) => {
    try {
      if (!activeProduct) return
      
      const images = activeProduct.product_images || []
      const effectiveMainIdx = mainImageIndex >= 0 && mainImageIndex < images.length ? mainImageIndex : 0
      const effectiveSecIdx = secondaryImageIndex >= 0 && secondaryImageIndex < images.length ? secondaryImageIndex : (images.length > 1 ? 1 : 0)
      
      const mainImageUrl = images[effectiveMainIdx]?.image_url || ""
      const secImageUrl = images[effectiveSecIdx]?.image_url || ""

      const [headerBg, logo, mainImg, secImg] = await Promise.all([
        loadImg("/images/banner-header-bg.png"),
        avatarUrl ? loadImg(avatarUrl) : loadImg("/images/avatar-morante.png"),
        mainImageUrl ? loadImg(mainImageUrl) : Promise.resolve(null as any),
        (secImageUrl && showSecondaryImage) ? loadImg(secImageUrl) : Promise.resolve(null as any),
      ])

      drawBannerSync(canvas, { headerBg, logo, mainImg, secImg }, isExport)
    } catch (error) {
      console.error("Erro no carregamento assíncrono do banner:", error)
    }
  }`

// 2. Substitui as linhas no arquivo original
const prefix = lines.slice(0, startIdx).join('\n')
const suffix = lines.slice(endIdx + 1).join('\n')

const newContent = `${prefix}
${drawBannerSyncCode}

${drawBannerAsyncCode}
${suffix}`

fs.writeFileSync(filePath, newContent, 'utf-8')
console.log("Arquivo otimizado e reescrito com sucesso!")
