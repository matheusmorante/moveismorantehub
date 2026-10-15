/**
 * Otimiza uma imagem para ser 1:1 (quadrada) e reduz o tamanho do arquivo
 * exportando em formato WebP de alta eficiência (~100-200kb a 1080p).
 */
export async function optimizeProductImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Não foi possível criar o contexto do canvas'));
        return;
      }

      // Definir tamanho alvo (1080x1080 para alta qualidade e tamanho ultra reduzido)
      const targetSize = 1080;
      canvas.width = targetSize;
      canvas.height = targetSize;

      // Calcular dimensões para crop 1:1 centralizado
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = img.width;
      let sourceHeight = img.height;

      if (img.width > img.height) {
        sourceWidth = img.height;
        sourceX = (img.width - img.height) / 2;
      } else {
        sourceHeight = img.width;
        sourceY = (img.height - img.width) / 2;
      }

      // Desenhar imagem no canvas com crop
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        targetSize,
        targetSize
      );

      // Exportar como WebP com compressão de alta fidelidade
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Erro ao gerar Blob da imagem'));
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Erro ao carregar a imagem'));
  });
}
