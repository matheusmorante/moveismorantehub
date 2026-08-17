const fs = require('fs');
const path = require('path');

function checkLocalFeed() {
  const filePath = path.join(__dirname, '..', 'feed.tsv');
  if (!fs.existsSync(filePath)) {
    console.log("Arquivo feed.tsv não existe na raiz do projeto.");
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  if (lines.length === 0) {
    console.log("feed.tsv está vazio.");
    return;
  }

  const header = lines[0].split('\t');
  console.log("Cabeçalhos detectados:", header);

  const imageLinkIndex = header.indexOf('image_link');
  const idIndex = header.indexOf('id');
  const titleIndex = header.indexOf('title');

  if (imageLinkIndex === -1) {
    console.log("Erro: Não foi encontrada a coluna 'image_link' no feed.tsv");
    return;
  }

  let emptyImagesCount = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const columns = lines[i].split('\t');
    const id = columns[idIndex] || `linha ${i}`;
    const title = columns[titleIndex] || '';
    const imageLink = columns[imageLinkIndex] || '';

    if (!imageLink.trim()) {
      console.log(`[LOCAL FEED] Linha ${i} | ID: ${id} | Título: ${title} está sem imagem!`);
      emptyImagesCount++;
    } else if (!imageLink.startsWith('http')) {
      console.log(`[LOCAL FEED RELATIVO] Linha ${i} | ID: ${id} | Título: ${title} | URL: ${imageLink}`);
      emptyImagesCount++;
    }
  }

  console.log(`\nVerificação do feed.tsv local concluída. Total de linhas sem imagem ou com imagem relativa: ${emptyImagesCount}`);
}

checkLocalFeed();
