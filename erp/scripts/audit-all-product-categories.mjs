import fs from 'fs';

const file400 = JSON.parse(fs.readFileSync('C:/Users/mathe/.gemini/antigravity/brain/c35d29c2-005b-4d83-90c9-560b946d11d6/.system_generated/steps/400/output.txt', 'utf8'));
const res400 = file400.result;
const pStart = res400.indexOf('[');
const pEnd = res400.lastIndexOf(']') + 1;
const products = JSON.parse(res400.substring(pStart, pEnd));
console.log(`Total products loaded: ${products.length}`);

// Read categories
const file396 = JSON.parse(fs.readFileSync('C:/Users/mathe/.gemini/antigravity/brain/c35d29c2-005b-4d83-90c9-560b946d11d6/.system_generated/steps/396/output.txt', 'utf8'));
const res396 = file396.result;
const cStart = res396.indexOf('[');
const cEnd = res396.lastIndexOf(']') + 1;
const categories = JSON.parse(res396.substring(cStart, cEnd));
const catByName = Object.fromEntries(categories.map(c => [c.name.toLowerCase(), c]));
const catById = Object.fromEntries(categories.map(c => [c.id, c]));

console.log(`Total categories: ${categories.length}`);

const missingCategory = [];
const mismatchedCategory = [];
const desyncedCategories = [];

for (const p of products) {
  const name = (p.name || '').trim();
  const nameLower = name.toLowerCase();
  const primCat = p.primary_category_name;
  const linkedCats = p.linked_category_names || [];

  // Check 1: Missing category
  if (!p.category_id || !primCat || linkedCats.length === 0) {
    missingCategory.push({
      id: p.id,
      name: p.name,
      active: p.active,
      category_id: p.category_id,
      primary_category_name: primCat,
      linked_category_names: linkedCats
    });
  }

  // Check 2: Desync between p.category_id and product_categories
  if (p.category_id && (!p.linked_category_ids || !p.linked_category_ids.includes(p.category_id))) {
    desyncedCategories.push({
      id: p.id,
      name: p.name,
      category_id: p.category_id,
      primary_category_name: primCat,
      linked_category_ids: p.linked_category_ids
    });
  }

  // Check 3: Obvious category mismatches based on product naming
  // Rules for semantic category detection:
  let suggestedCategory = null;
  let reason = '';

  // Generic parent categories that should ideally be specific subcategories:
  // e.g. "Quarto", "Sala de Estar", "Cozinha", "Sala de Jantar", "Escritório"
  
  if (nameLower.includes('guarda roupa') || nameLower.includes('guarda-roupa') || nameLower.includes('roupeiro')) {
    if (primCat !== 'Guarda-Roupas') {
      suggestedCategory = 'Guarda-Roupas';
      reason = 'Name indicates Guarda-Roupas';
    }
  } else if (nameLower.includes('cômoda') || nameLower.includes('comoda')) {
    if (primCat !== 'Cômodas') {
      suggestedCategory = 'Cômodas';
      reason = 'Name indicates Cômodas';
    }
  } else if (nameLower.includes('balcão para pia') || nameLower.includes('balcao para pia') || nameLower.includes('balcão pia') || nameLower.includes('balcao pia')) {
    if (primCat !== 'Balcões para Pia') {
      suggestedCategory = 'Balcões para Pia';
      reason = 'Name indicates Balcões para Pia';
    }
  } else if (nameLower.includes('balcão cooktop') || nameLower.includes('balcao cooktop') || nameLower.includes('para cooktop')) {
    if (primCat !== 'Balcões para Cooktop') {
      suggestedCategory = 'Balcões para Cooktop';
      reason = 'Name indicates Balcões para Cooktop';
    }
  } else if (nameLower.includes('cozinha modulada') || nameLower.includes('cozinha compacta') || nameLower.includes('jogo de cozinha')) {
    if (primCat !== 'Cozinhas Moduladas e Compactas') {
      suggestedCategory = 'Cozinhas Moduladas e Compactas';
      reason = 'Name indicates Cozinhas Moduladas e Compactas';
    }
  } else if (nameLower.includes('colchão') || nameLower.includes('colchao')) {
    if (primCat !== 'Colchões') {
      suggestedCategory = 'Colchões';
      reason = 'Name indicates Colchões';
    }
  } else if (nameLower.includes('cama box') || nameLower.includes('base box') || nameLower.includes('cama baú') || nameLower.includes('cama bau') || nameLower.includes('conjunto box')) {
    if (primCat !== 'Camas/Bases Box') {
      suggestedCategory = 'Camas/Bases Box';
      reason = 'Name indicates Camas/Bases Box';
    }
  } else if (nameLower.includes('cabeceira')) {
    if (primCat !== 'Cabeceiras') {
      suggestedCategory = 'Cabeceiras';
      reason = 'Name indicates Cabeceiras';
    }
  } else if (nameLower.includes('mesa de cabeceira') || nameLower.includes('mesinha de cabeceira') || nameLower.includes('criado mudo')) {
    if (primCat !== 'Mesas de Cabeceira') {
      suggestedCategory = 'Mesas de Cabeceira';
      reason = 'Name indicates Mesas de Cabeceira';
    }
  } else if (nameLower.includes('sofá') || nameLower.includes('sofa') || nameLower.includes('estofado')) {
    if (primCat !== 'Sofás') {
      suggestedCategory = 'Sofás';
      reason = 'Name indicates Sofás';
    }
  } else if (nameLower.includes('poltrona')) {
    if (primCat !== 'Poltronas') {
      suggestedCategory = 'Poltronas';
      reason = 'Name indicates Poltronas';
    }
  } else if (nameLower.includes('painel') && !nameLower.includes('rack')) {
    if (primCat !== 'Painéis') {
      suggestedCategory = 'Painéis';
      reason = 'Name indicates Painéis';
    }
  } else if (nameLower.includes('rack') && !nameLower.includes('painel')) {
    if (primCat !== 'Racks') {
      suggestedCategory = 'Racks';
      reason = 'Name indicates Racks';
    }
  } else if (nameLower.includes('home') || (nameLower.includes('rack') && nameLower.includes('painel'))) {
    if (primCat !== 'Homes' && primCat !== 'Racks' && primCat !== 'Painéis') {
      suggestedCategory = 'Homes';
      reason = 'Name indicates Homes';
    }
  } else if (nameLower.includes('armário multiuso') || nameLower.includes('armario multiuso') || nameLower.includes('multiuso')) {
    if (primCat !== 'Armários Multiuso' && primCat !== 'Sapateiras') {
      suggestedCategory = 'Armários Multiuso';
      reason = 'Name indicates Armários Multiuso';
    }
  } else if (nameLower.includes('sapateira')) {
    if (primCat !== 'Sapateiras') {
      suggestedCategory = 'Sapateiras';
      reason = 'Name indicates Sapateiras';
    }
  } else if (nameLower.includes('cristaleira')) {
    if (primCat !== 'Cristaleiras') {
      suggestedCategory = 'Cristaleiras';
      reason = 'Name indicates Cristaleiras';
    }
  } else if (nameLower.includes('aparador') || nameLower.includes('buffet')) {
    if (primCat !== 'Aparadores Buffets') {
      suggestedCategory = 'Aparadores Buffets';
      reason = 'Name indicates Aparadores Buffets';
    }
  } else if (nameLower.includes('paneleiro')) {
    if (primCat !== 'Paneleiros') {
      suggestedCategory = 'Paneleiros';
      reason = 'Name indicates Paneleiros';
    }
  } else if (nameLower.includes('armário aéreo') || nameLower.includes('armario aereo') || nameLower.includes('aéreo') || nameLower.includes('aereo')) {
    if (primCat !== 'Armários Aéreos' && primCat !== 'Cozinhas Moduladas e Compactas') {
      suggestedCategory = 'Armários Aéreos';
      reason = 'Name indicates Armários Aéreos';
    }
  } else if (nameLower.includes('beliche')) {
    if (primCat !== 'Beliches') {
      suggestedCategory = 'Beliches';
      reason = 'Name indicates Beliches';
    }
  } else if (nameLower.includes('treliche')) {
    if (primCat !== 'Treliches') {
      suggestedCategory = 'Treliches';
      reason = 'Name indicates Treliches';
    }
  } else if (nameLower.includes('berço') || nameLower.includes('berco')) {
    if (primCat !== 'Berços') {
      suggestedCategory = 'Berços';
      reason = 'Name indicates Berços';
    }
  } else if (nameLower.includes('escrivaninha') || nameLower.includes('mesa para escritório') || nameLower.includes('mesa gamer')) {
    if (primCat !== 'Mesas para Escritório') {
      suggestedCategory = 'Mesas para Escritório';
      reason = 'Name indicates Mesas para Escritório';
    }
  } else if (nameLower.includes('cadeira') && (nameLower.includes('escritório') || nameLower.includes('presidente') || nameLower.includes('diretor'))) {
    if (primCat !== 'Cadeiras para Escritório') {
      suggestedCategory = 'Cadeiras para Escritório';
      reason = 'Name indicates Cadeiras para Escritório';
    }
  } else if (nameLower.includes('mesa') && nameLower.includes('cadeira')) {
    if (primCat !== 'Conjunto Mesa e Cadeiras') {
      suggestedCategory = 'Conjunto Mesa e Cadeiras';
      reason = 'Name indicates Conjunto Mesa e Cadeiras';
    }
  } else if (nameLower.includes('mesa') && (nameLower.includes('jantar') || nameLower.includes('cozinha'))) {
    if (primCat !== 'Mesas para Cozinha/Sala de Jantar' && primCat !== 'Conjunto Mesa e Cadeiras') {
      suggestedCategory = 'Mesas para Cozinha/Sala de Jantar';
      reason = 'Name indicates Mesas para Cozinha/Sala de Jantar';
    }
  } else if (nameLower.includes('cadeira') && (nameLower.includes('jantar') || nameLower.includes('cozinha'))) {
    if (primCat !== 'Cadeiras para Cozinha/Sala de Jantar' && primCat !== 'Conjunto Mesa e Cadeiras') {
      suggestedCategory = 'Cadeiras para Cozinha/Sala de Jantar';
      reason = 'Name indicates Cadeiras para Cozinha/Sala de Jantar';
    }
  }

  if (suggestedCategory) {
    mismatchedCategory.push({
      id: p.id,
      name: p.name,
      active: p.active,
      currentCategory: primCat,
      linkedCats,
      suggestedCategory,
      reason
    });
  }
}

console.log('\n--- 1. MISSING CATEGORY ---');
console.log(`Found: ${missingCategory.length}`);
missingCategory.forEach(p => console.log(`- [${p.active ? 'ACTIVE' : 'INACTIVE'}] "${p.name}" (ID: ${p.id}) -> Primary: ${p.primary_category_name}, Linked: ${p.linked_category_names?.join(', ')}`));

console.log('\n--- 2. DESYNCED CATEGORIES ---');
console.log(`Found: ${desyncedCategories.length}`);
desyncedCategories.forEach(p => console.log(`- "${p.name}" (ID: ${p.id}) -> category_id: ${p.category_id} (${p.primary_category_name}) but linked: ${p.linked_category_ids}`));

console.log('\n--- 3. POTENTIAL MISMATCHES ---');
console.log(`Found: ${mismatchedCategory.length}`);
mismatchedCategory.forEach(p => console.log(`- [${p.active ? 'ACTIVE' : 'INACTIVE'}] "${p.name}" (ID: ${p.id})\n  Current: "${p.currentCategory}" (Linked: ${p.linkedCats.join(', ')})\n  Suggested: "${p.suggestedCategory}" (Reason: ${p.reason})`));

fs.writeFileSync('erp/scripts/category_audit_report.json', JSON.stringify({
  totalProducts: products.length,
  missingCategory,
  desyncedCategories,
  mismatchedCategory
}, null, 2));
