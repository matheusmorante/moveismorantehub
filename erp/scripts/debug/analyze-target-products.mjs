import fs from 'fs';

const products = JSON.parse(fs.readFileSync('erp/scripts/target_products_data.json', 'utf8'));

console.log(`Analyzing ${products.length} products...\n`);

const summary = {
  missingPortas: [],
  missingGavetas: [],
  missingBoth: [],
  missingDimensions: [],
  missingBrandOrModel: [],
  missingStructure: [],
  hasBothDoorsAndDrawers: []
};

for (const p of products) {
  const specs = p.technical_specs || {};
  const techVals = specs.technicalValues || {};

  const portas = techVals['Quantidade de portas'];
  const gavetas = techVals['Quantidade de gavetas'];
  const altura = techVals['Altura'] || p.height;
  const largura = techVals['Largura'] || p.width;
  const profundidade = techVals['Profundidade'] || p.depth;
  const marca = techVals['Marca'] || p.brand;
  const modelo = techVals['Modelo'];
  const estrutura = techVals['Material da estrutura'];

  const isMissingPortas = !portas || portas === '';
  const isMissingGavetas = !gavetas || gavetas === '';
  const isMissingDims = !altura || !largura || !profundidade;
  const isMissingBrandOrModel = !marca || !modelo;
  const isMissingStructure = !estrutura;

  if (isMissingPortas && isMissingGavetas) {
    summary.missingBoth.push({ id: p.id, name: p.name, cats: p.categoryNames, desc: p.description, techVals });
  } else if (isMissingPortas) {
    summary.missingPortas.push({ id: p.id, name: p.name, cats: p.categoryNames, desc: p.description, techVals });
  } else if (isMissingGavetas) {
    summary.missingGavetas.push({ id: p.id, name: p.name, cats: p.categoryNames, desc: p.description, techVals });
  } else {
    summary.hasBothDoorsAndDrawers.push({ id: p.id, name: p.name, cats: p.categoryNames, portas, gavetas, techVals });
  }

  if (isMissingDims) {
    summary.missingDimensions.push({ id: p.id, name: p.name, altura, largura, profundidade });
  }
}

console.log(`Products with BOTH portas and gavetas: ${summary.hasBothDoorsAndDrawers.length}`);
console.log(`Products missing portas only: ${summary.missingPortas.length}`);
console.log(`Products missing gavetas only: ${summary.missingGavetas.length}`);
console.log(`Products missing BOTH portas and gavetas: ${summary.missingBoth.length}`);
console.log(`Products missing some dimension: ${summary.missingDimensions.length}`);

fs.writeFileSync('erp/scripts/products_analysis_summary.json', JSON.stringify(summary, null, 2));
