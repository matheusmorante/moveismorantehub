import * as fs from 'fs'

const filePath = 'c:\\Users\\Rosilene\\Desktop\\ecommerce\\src\\app\\admin\\marketing\\page.tsx'
const content = fs.readFileSync(filePath, 'utf-8')

// Normaliza quebras de linha para fazer o match independente de ser CRLF ou LF
const normalizedContent = content.replace(/\r\n/g, '\n')

const target = `      ctx.textAlign = "left"
    } catch (error) {
      console.error("Erro ao desenhar banner no canvas:", error)
    }
      
      ctx.textAlign = "left"
    } catch (error) {
      console.error("Erro ao desenhar banner no canvas de forma síncrona:", error)
    }
  }`.replace(/\r\n/g, '\n')

const replacement = `      ctx.textAlign = "left"
    } catch (error) {
      console.error("Erro ao desenhar banner no canvas de forma síncrona:", error)
    }
  }`.replace(/\r\n/g, '\n')

if (normalizedContent.includes(target)) {
  const updated = normalizedContent.replace(target, replacement)
  // Restaura o formato CRLF para o Windows antes de gravar
  const finalContent = updated.replace(/\n/g, '\r\n')
  fs.writeFileSync(filePath, finalContent, 'utf-8')
  console.log("Sintaxe corrigida com sucesso com normalização CRLF/LF!")
} else {
  console.error("Erro: O bloco de código duplicado normalizado não foi encontrado!")
}
