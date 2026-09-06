import fs from 'fs';
import https from 'https';
import path from 'path';

const imageUrl = 'https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmE5YzgxN2JlMDIwODE5MTg1NjBlM2YyYTFiNWRmZmM6c2VkaW1lbnQ6Ly8wMzA1MTk5MzVmNjlhOGEjZmlsZV8wMDAwMDAwMGRmNDA4MjBlOWRmN2FkOWMxNTNjMTczZCN1bmZ1cmwiLCJnaXptb19pZCI6bnVsbCwid2lkIjpudWxsLCJvaWQiOm51bGwsInNpZCI6bnVsbCwiY3MiOm51bGwsImZuIjpudWxsLCJjZCI6bnVsbCwidHMiOiIyMDcwMSIsInAiOiJweWkiLCJjaWQiOiIxIiwic2lnIjoiOGJmODU3NWFiNTkzN2ExNDUyY2RmYjFkZGM4MDM1NjM5NGQyNTM0MDc4MzY2MDFhYTc4NzYzN2UyOWQ2Y2FjMCIsInYiOiIwIiwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGwsImZuIjpudWxsfQ==';

const targetDirs = [
  'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/erp/public/assets',
  'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/digital-catalog/public/assets',
  'c:/Users/mathe/OneDrive/Área de Trabalho/projetos/morantehub/mobile/assets'
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const targetPath = path.join(targetDirs[0], 'queima_salvados_badge.png');

console.log('Baixando imagem de:', imageUrl);

https.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  if (res.statusCode === 301 || res.statusCode === 302) {
    console.log('Redirecionando para:', res.headers.location);
    https.get(res.headers.location, (res2) => {
      saveStream(res2);
    });
  } else {
    saveStream(res);
  }
}).on('error', (e) => {
  console.error('Erro no download:', e);
});

function saveStream(res) {
  const fileStream = fs.createWriteStream(targetPath);
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    fileStream.close();
    console.log('Download concluído com sucesso em:', targetPath);
    
    // Copiar para os outros diretórios
    targetDirs.slice(1).forEach(dir => {
      const dest = path.join(dir, 'queima_salvados_badge.png');
      fs.copyFileSync(targetPath, dest);
      console.log('Copiado para:', dest);
    });
  });
}
