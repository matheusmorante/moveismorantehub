const fs = require('fs');
const path = require('path');

function analyzeFeedAround27() {
  const filePath = path.join(__dirname, '..', 'feed.tsv');
  if (!fs.existsSync(filePath)) {
    console.log("feed.tsv não encontrado!");
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total de linhas no feed: ${lines.length}`);
  
  // Vamos analisar do índice 20 ao 40 (que corresponde à linha 21 até a 41 do feed)
  const startIndex = 20;
  const endIndex = Math.min(45, lines.length);

  const header = lines[0].split('\t');

  console.log("\n=== Analisando registros de 20 a 45 ===");
  for (let i = startIndex; i < endIndex; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cols = line.split('\t');
    const id = cols[0];
    const title = cols[1];
    const imageLink = cols[4];
    const link = cols[3];

    console.log(`Linha ${i + 1} | ID: ${id} | Título: ${title}`);
    console.log(`  - Image Link: ${imageLink}`);
    console.log(`  - Product Link: ${link}`);
    
    // Verificar se a URL da imagem é válida
    if (!imageLink) {
      console.log(`  [ALERTA] Imagem principal está VAZIA!`);
    } else {
      try {
        new URL(imageLink);
      } catch (e) {
        console.log(`  [ERRO] URL da imagem inválida: ${imageLink}`);
      }
    }

    // Verificar se a URL do produto é válida
    if (!link) {
      console.log(`  [ALERTA] URL do produto está VAZIA!`);
    } else {
      try {
        new URL(link);
      } catch (e) {
        console.log(`  [ERRO] URL do produto inválida: ${link}`);
      }
    }
  }
}

analyzeFeedAround27();
