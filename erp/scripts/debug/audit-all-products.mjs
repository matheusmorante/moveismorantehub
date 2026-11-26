import fs from 'fs';

const products = JSON.parse(fs.readFileSync('erp/scripts/target_products_full_inspection.json', 'utf8'));

// Known brands mapping
const BRANDS = [
  'Mopar', 'Faimec', 'Moval', 'Doripel', 'Darmovel', 'Castro', 'Móveis Sul', 'Moveis Sul',
  'Indekes', 'Evidência', 'Evidencia', 'Aramóveis', 'Aramoveis', 'Cadorin', 'JK',
  'Notável Móveis', 'Notável Moveis', 'Notavel', 'Qmovi', 'Gelius', 'Bianchi', 'Maxel',
  'Damulti', 'Telasul', 'Henn', 'MGM', 'Luciane', 'Móveis Europa', 'Moveis Europa', 'Cristalflex', 'Demóbile', 'Demobile'
];

function extractBrand(p) {
  if (p.brand && p.brand.trim() && p.brand !== 'Não se aplica') return p.brand.trim();
  const text = `${p.name} ${p.description || ''}`;
  for (const b of BRANDS) {
    const reg = new RegExp(`\\b${b}\\b`, 'i');
    if (reg.test(text)) {
      if (/aram[oó]veis/i.test(b)) return 'Aramóveis';
      if (/evid[eê]ncia/i.test(b)) return 'Evidência';
      if (/not[aá]vel/i.test(b)) return 'Notável Móveis';
      if (/m[oó]veis sul/i.test(b)) return 'Móveis Sul';
      if (/m[oó]veis europa/i.test(b)) return 'Móveis Europa';
      if (/dem[oó]bile/i.test(b)) return 'Demóbile';
      return b;
    }
  }
  return null;
}

function extractModel(p) {
  const name = p.name || '';
  // Try matching known model names
  const models = [
    'Florida', 'Flórida', 'Texas', 'Turim', 'Viena', 'Curitiba', 'Espanha', 'Grécia', 'Grecia',
    'Paris', 'Genebra', 'San Marino', 'Siena', 'Fortaleza', 'Fênix', 'Fenix', 'Pequim',
    'Sonata', 'Serena', 'Florence', 'Coimbra', 'Americano', 'São Paulo', 'Sao Paulo',
    'Bragança', 'Braganca', 'Califórnia', 'California', 'Isabela', 'Bergamo', 'Bérgame',
    'Absolut', 'Moema', 'Chile', 'Montevideu', 'New Xangai', 'New Mônaco', 'New Monaco',
    'Portugal', 'Salvador', 'Q Encanto Slim', 'Las Vegas', 'Londres', 'Atlanta', 'Monza',
    'Moscou', 'Nt5015', 'Rudá', 'Ruda', 'Toquio', 'Tóquio', 'Sidney', 'Capri', 'Splendore',
    'Verona', 'Dueto', 'Grife', 'Flora', 'Vegas', 'Vênus', 'Venus', 'Lille', 'Malta', 'Lara',
    'Geórgia', 'Georgia', 'França', 'Franca', 'Aconchego', 'Pop', 'Florença', 'Florenca', 'Laura',
    'Isis', 'Dália New', 'Dalia New', 'Grazi', 'Sophia', 'Catarina', 'Star', 'Tunísia', 'Tunisia',
    'Divina', 'Cadis', 'Dulce', 'Lorena', 'Napoli', 'Dubai', 'Apolo'
  ];

  for (const m of models) {
    const reg = new RegExp(`\\b${m}\\b`, 'i');
    if (reg.test(name) || reg.test(p.description || '')) {
      if (/fl[oó]rida/i.test(m)) return 'Flórida';
      if (/gr[eé]cia/i.test(m)) return 'Grécia';
      if (/f[eê]nix/i.test(m)) return 'Fênix';
      if (/s[aã]o paulo/i.test(m)) return 'São Paulo';
      if (/bragan[cç]a/i.test(m)) return 'Bragança';
      if (/calif[oó]rnia/i.test(m)) return 'Califórnia';
      if (/new m[oô]naco/i.test(m)) return 'New Mônaco';
      if (/t[oó]quio/i.test(m)) return 'Tóquio';
      if (/v[eê]nus/i.test(m)) return 'Vênus';
      if (/ge[oó]rgia/i.test(m)) return 'Geórgia';
      if (/fran[cç]a/i.test(m)) return 'França';
      if (/floren[cç]a/i.test(m)) return 'Florença';
      if (/d[aá]lia new/i.test(m)) return 'Dália New';
      if (/tun[ií]sia/i.test(m)) return 'Tunísia';
      if (/rud[aá]/i.test(m)) return 'Rudá';
      return m;
    }
  }
  return null;
}

function extractDoors(p) {
  const text = `${p.name} ${p.description || ''}`;
  // match "X portas", "Xpt", "X pt", "X P"
  const m = text.match(/(\d+)\s*(?:portas?|pt\b|p\b)/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return num === 1 ? '1 porta' : `${num} portas`;
  }
  return null;
}

function extractDrawers(p) {
  const text = `${p.name} ${p.description || ''}`;
  // match "X gavetas", "Xgv", "X gv", "Xg\b"
  const m = text.match(/(\d+)\s*(?:gavetas?|gv\b)/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return num === 1 ? '1 gaveta' : `${num} gavetas`;
  }
  return null;
}

function extractDimensions(p) {
  const text = `${p.description || ''} ${p.measures || ''}`;
  let altura = p.height || null;
  let largura = p.width || null;
  let profundidade = p.depth || null;

  // Patterns like Altura: 216 cm, Largura: 207 cm, Profundidade: 45 cm
  const mAlt = text.match(/altura(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mAlt && !altura) {
    let v = mAlt[1].replace(',', '.');
    if (parseFloat(v) < 3) v = (parseFloat(v) * 100).toString(); // e.g. 2.16m -> 216cm
    altura = v;
  }

  const mLarg = text.match(/largura(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mLarg && !largura) {
    let v = mLarg[1].replace(',', '.');
    if (parseFloat(v) < 3.5) v = (parseFloat(v) * 100).toString(); // e.g. 2.07m -> 207cm
    largura = v;
  }

  const mProf = text.match(/profundidade(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mProf && !profundidade) {
    let v = mProf[1].replace(',', '.');
    if (parseFloat(v) < 1.5) v = (parseFloat(v) * 100).toString(); // e.g. 0.45m -> 45cm
    profundidade = v;
  }

  return { altura, largura, profundidade };
}

function extractStructure(p) {
  const text = `${p.name} ${p.description || ''}`;
  if (/100%\s*mdf/i.test(text)) return '100% MDF';
  if (/mdf\/mdp|mdp\/mdf/i.test(text)) return 'MDF/MDP';
  if (/\bmdp\b/i.test(text) && !/\bmdf\b/i.test(text)) return 'MDP';
  if (/\bmdf\b/i.test(text) && !/\bmdp\b/i.test(text)) return '100% MDF';
  return null;
}

function extractDoorType(p) {
  const text = `${p.name} ${p.description || ''}`;
  if (/correr.*basculante|basculante.*correr/i.test(text)) return 'Correr + Basculante';
  if (/bater.*basculante|basculante.*bater/i.test(text)) return 'Bater + Basculante';
  if (/portas? de correr/i.test(text)) return 'Correr';
  if (/basculante/i.test(text)) return 'Basculante';
  return 'Bater';
}

function extractSlideType(p) {
  const text = `${p.name} ${p.description || ''}`;
  if (/telesc[oó]pica/i.test(text)) return 'Corrediça telescópica';
  if (/met[aá]lica/i.test(text)) return 'Corrediça metálica simples';
  if (/pl[aá]stica/i.test(text)) return 'Guia plástica';
  return null;
}

function extractMirror(p) {
  const text = `${p.name} ${p.description || ''}`;
  if (/sem espelho/i.test(text)) return 'Não';
  if (/com espelho|espelhad[ao]|possui espelho/i.test(text)) return 'Sim';
  return 'Não';
}

const audit = products.map(p => {
  const tv = p.techVals || {};
  const doors = tv['Quantidade de portas'] || extractDoors(p);
  const drawers = tv['Quantidade de gavetas'] || extractDrawers(p);
  const dims = extractDimensions(p);
  const brand = tv['Marca'] || extractBrand(p);
  const model = tv['Modelo'] || extractModel(p);
  const structure = tv['Material da estrutura'] || extractStructure(p);
  const doorType = tv['Tipo de portas'] || extractDoorType(p);
  const slideType = tv['Tipo/material da corrediça'] || extractSlideType(p);
  const mirror = tv['Possui espelho'] || (p.categoryNames.includes('Guarda-Roupas') || p.categoryNames.includes('Cômodas') ? extractMirror(p) : null);

  // Variations color check
  const varUpdates = [];
  for (const v of p.variations) {
    if (!v.attributes || Object.keys(v.attributes).length === 0 || !v.attributes.Cor) {
      // Try to extract color from variation name
      // Usually "Product Name Color/Color"
      const vName = v.name || '';
      // Find color part after model/product name
      let color = null;
      if (vName.includes(p.name)) {
        color = vName.replace(p.name, '').trim();
      } else {
        // Look for slash or color keywords
        const slashIdx = vName.lastIndexOf(' ');
        if (slashIdx !== -1) {
          color = vName.substring(slashIdx).trim();
        }
      }
      if (color) {
        varUpdates.push({ id: v.id, name: v.name, proposedColor: color });
      }
    }
  }

  return {
    id: p.id,
    name: p.name,
    categoryNames: p.categoryNames,
    currentTv: tv,
    proposed: {
      'Quantidade de portas': doors,
      'Quantidade de gavetas': drawers,
      'Altura': dims.altura || tv['Altura'],
      'Largura': dims.largura || tv['Largura'],
      'Profundidade': dims.profundidade || tv['Profundidade'],
      'Marca': brand,
      'Modelo': model,
      'Material da estrutura': structure,
      'Tipo de portas': doorType,
      'Tipo/material da corrediça': slideType,
      ...(mirror ? { 'Possui espelho': mirror } : {})
    },
    varUpdates
  };
});

fs.writeFileSync('erp/scripts/products_audit_result.json', JSON.stringify(audit, null, 2));
console.log('Audit completed for', audit.length, 'products.');
