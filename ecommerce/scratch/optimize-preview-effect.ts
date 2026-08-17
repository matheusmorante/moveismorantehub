import * as fs from 'fs'
import * as path from 'path'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

const lines = content.split('\n')

let startIdx = -1
let endIdx = -1

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Redesenha o preview sempre que qualquer configuração mudar')) {
    startIdx = i
  }
  if (startIdx !== -1 && lines[i].includes('// Desenha e baixa a imagem localmente')) {
    // Encontra a linha anterior
    for (let j = i - 1; j > startIdx; j--) {
      if (lines[j].trim() === '])') {
        endIdx = j
        break
      }
    }
    break
  }
}

console.log(`useEffect de preview - Início: linha ${startIdx + 1}, Fim: linha ${endIdx + 1}`)

const newEffectCode = `  // Redesenha o preview sempre que qualquer configuração mudar
  useEffect(() => {
    if (!isModalOpen || !activeProduct || !previewCanvasRef.current) return
    
    // Tenta renderizar síncronamente do cache imediato se possível para eliminar delay (60fps fluidos no arraste)
    const canvas = previewCanvasRef.current
    const mainImageUrl = activeProduct.product_images?.[mainImageIndex]?.image_url || ""
    const secImageUrl = activeProduct.product_images?.[secondaryImageIndex]?.image_url || ""
    const logoUrl = avatarUrl || "/images/avatar-morante.png"
    const headerBgUrl = "/images/banner-header-bg.png"

    const headerBg = imageCacheRef.current[headerBgUrl]
    const logo = imageCacheRef.current[logoUrl]
    const mainImg = mainImageUrl ? imageCacheRef.current[mainImageUrl] : null
    const secImg = (secImageUrl && showSecondaryImage) ? imageCacheRef.current[secImageUrl] : null

    const hasHeader = !headerBgUrl || headerBg
    const hasLogo = !logoUrl || logo
    const hasMain = !mainImageUrl || mainImg
    const hasSec = !(secImageUrl && showSecondaryImage) || !secImageUrl || secImg

    if (hasHeader && hasLogo && hasMain && hasSec) {
      drawBannerSync(canvas, { headerBg, logo, mainImg, secImg }, false)
    } else {
      // Fallback assíncrono (carrega no cache e depois desenha)
      drawBannerAsync(canvas, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isModalOpen, activeProduct, selectedElement,
    mainImageScale, secondaryImageScale,
    mainImageOffsetX, mainImageOffsetY,
    secondaryImageOffsetX, secondaryImageOffsetY,
    mainImageIndex, secondaryImageIndex,
    showSecondaryImage, showOpportunityBadge,
    installmentsText, installmentsFontSize, installmentsOffsetX, installmentsOffsetY,
    customPrice, customPromoPrice,
    displayPrice, isPromo, marketingDefaults,
    brandName, brandFontSize, brandOffsetX, brandOffsetY,
    slogan, sloganFontSize, sloganOffsetX, sloganOffsetY,
    oppRotation, oppScale, oppOffsetX, oppOffsetY,
    avatarUrl, avatarScale, avatarOffsetX, avatarOffsetY,
    footerAddressTitle, footerAddressTitleFontSize, footerAddressTitleOffsetX, footerAddressTitleOffsetY,
    footerAddressText, footerAddressTextFontSize, footerAddressTextOffsetX, footerAddressTextOffsetY,
    productTitle, productTitleFontSize, productTitleOffsetX, productTitleOffsetY, productTitleMaxContainerWidth,
    priceFontSize, priceDeFontSize, priceOffsetX, priceOffsetY,
    porApenasText, porApenasFontSize, porApenasColor, porApenasOffsetX, porApenasOffsetY,
    measuresText, measuresFontSize, measuresOffsetX, measuresOffsetY
  ])`

const prefix = lines.slice(0, startIdx).join('\n')
const suffix = lines.slice(endIdx + 1).join('\n')

const newContent = `${prefix}
${newEffectCode}
${suffix}`

fs.writeFileSync(filePath, newContent, 'utf-8')
console.log("useEffect do preview otimizado com sucesso!")
