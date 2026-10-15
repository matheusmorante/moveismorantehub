import fs from 'fs';

const products = JSON.parse(fs.readFileSync('erp/scripts/target_products_full_inspection.json', 'utf8'));

// Exact overrides map for products with manual verification
const MANUAL_OVERRIDES = {
  // 1. Armário Multiuso Dubai 4 Portas 7 Prateleiras
  '5511f886-6626-45c8-8c9b-3d6b55305c19': {
    portas: '4 portas',
    gavetas: '0 gavetas',
    marca: 'Moval',
    modelo: 'Dubai',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    espelho: 'Não'
  },
  // 2. Balcão para Pia 1,20 3 Gavetas 100% MDF Darmovel
  '3e1797d3-80f8-4423-a18a-07ce7b010baa': {
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'Darmovel',
    modelo: 'Pop',
    estrutura: '100% MDF',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 3. Balcao Notavel Nt 3075 C/Fruteira 1pt 2cestos Branco New
  '5f3d2a9b-710d-4f00-a978-53ad533293bc': {
    portas: '1 porta',
    gavetas: '0 gavetas',
    altura: '122',
    largura: '67',
    profundidade: '42',
    marca: 'Notável Móveis',
    modelo: 'NT 3075',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 4. Balcao Cooktop Notavel Nt 3110 1gv P/4bocas Freijo
  'adce8049-ba7e-4da7-a5dd-5a66369ed5c9': {
    portas: '2 portas',
    gavetas: '1 gaveta',
    altura: '87.3',
    largura: '75.4',
    profundidade: '52',
    marca: 'Notável Móveis',
    modelo: 'NT 3110',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 5. Balcão para Pia de 1,60m 3 Gavetas Darmovel
  '0dce5b6f-d093-466f-8ada-c8d005bccf39': {
    portas: '3 portas',
    gavetas: '3 gavetas',
    marca: 'Darmovel',
    modelo: 'Darmovel 1,60m',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 6. Cozinha Modulada 2,39 m JK 3 Peças Branca
  '6cfb0413-a223-4585-9dab-c2024d26e93b': {
    portas: '8 portas',
    gavetas: '3 gavetas',
    altura: '196',
    largura: '239',
    profundidade: '53',
    marca: 'JK',
    modelo: 'JK 3 Peças',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples'
  },
  // 7. BALCÃO PARA PIA JK 1º LINHA 3 GAVETAS
  '087bb01e-812c-4040-b743-2aebc77f46e6': {
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'JK',
    modelo: 'JK 1ª Linha',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 8. Balcão para Pia de 1,20m 3 Gavetas 100% MDF Florença
  'f56e238f-a86c-4f5e-853b-7d63c5c963b8': {
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'Móveis Sul',
    modelo: 'Florença',
    estrutura: '100% MDF',
    tipoPortas: 'Bater',
    corredica: 'Corrediça telescópica',
    tampo: 'Não',
    pia: 'Não'
  },
  // 9. Guarda Roupa Faimec Portugal 2 Portas Branco
  '1ccb82a9-d395-4c79-8b1a-4773c0262444': {
    portas: '2 portas',
    gavetas: '2 gavetas',
    altura: '223',
    largura: '85',
    profundidade: '48',
    marca: 'Faimec',
    modelo: 'Portugal',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça telescópica',
    cabideiro: 'Alumínio',
    puxadores: 'Plástico / ABS',
    espelho: 'Não'
  },
  // 10. Cômoda Geórgia 8 Gavetas Freijó/CInza
  '4b064f92-bf4b-4348-bf02-deaa35884a4e': {
    portas: '0 portas',
    gavetas: '8 gavetas',
    marca: 'Moval',
    modelo: 'Geórgia',
    estrutura: 'MDP',
    corredica: 'Corrediça telescópica'
  },
  // 11. Cômoda Lara 8 Gavetas
  '4ab2308b-20f9-42f6-a025-901b4b649ced': {
    portas: '0 portas',
    gavetas: '8 gavetas',
    marca: 'Moval',
    modelo: 'Lara',
    estrutura: 'MDF/MDP',
    corredica: 'Corrediça telescópica'
  },
  // 12. Balcao Para Forno e Cooktop Apolo Com 1 Gaveta
  'a5c6dd78-f819-4f48-b0d4-381d74111e9a': {
    portas: '2 portas',
    gavetas: '1 gaveta',
    marca: 'Notável Móveis',
    modelo: 'Apolo',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 13. Balcão para Pia de 1,20m 3 Gaveta
  '6dd07ec2-87bc-4497-90a7-59093d1ca220': {
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'Moval',
    modelo: 'Econômico',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 14. Balcão para Pia de 1,60m 3 Gavetas 1° Linha
  '1e66d8e5-b521-498e-bd98-99e82f90a6b6': {
    portas: '3 portas',
    gavetas: '3 gavetas',
    marca: 'Móveis Morante',
    modelo: '1ª Linha',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 15. Multiuso Dueto 90cm 4 Portas Doripel Branco
  '45570901-f295-46b2-984d-96af85e0079a': {
    portas: '4 portas',
    gavetas: '0 gavetas',
    marca: 'Doripel',
    modelo: 'Dueto',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    espelho: 'Não'
  },
  // 16. Guarda Roupa Casal Ripado 6 Portas com Pés Siena Faimec
  'e7108621-e13d-47ea-a58d-f8b6c2f7f5af': {
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Faimec',
    modelo: 'Siena',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    espelho: 'Não'
  },
  // 17. Cozinha Modulada 3 Peças 1,85m Darmovel
  '4b8db5d2-5eff-44f7-a3ca-ff64aa6f9e71': {
    portas: '8 portas',
    gavetas: '3 gavetas',
    marca: 'Darmovel',
    modelo: 'Pop / Gênova',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples'
  },
  // 18. Cozinha Sophia para Pia/Tampo de 1,20
  '999e41ef-8d32-4cc9-8cb4-e36cbc9e52fa': {
    portas: '4 portas',
    gavetas: '1 gaveta',
    marca: 'Móveis Sul',
    modelo: 'Sophia',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples'
  },
  // 19. Guarda Roupa Califórnia 4 Portas com Espelho 1,75m
  'da424efe-36d5-4124-8f4b-a4a86f80698e': {
    portas: '4 portas',
    gavetas: '3 gavetas',
    marca: 'Moval',
    modelo: 'Califórnia',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça telescópica',
    espelho: 'Sim',
    largura: '176',
    altura: '230',
    profundidade: '52'
  },
  // 20. Balcão para Pia de 1,20m Pop Darmovel
  'bb75757c-19ce-44b1-8af5-705746fb1cb9': {
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'Darmovel',
    modelo: 'Pop',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    tampo: 'Não',
    pia: 'Não'
  },
  // 21. Guarda Roupa Bragança 100% MDF com Espelho
  '0d5ec9bf-db88-4e26-8198-7d4f2e13ef3a': {
    portas: '3 portas',
    gavetas: '6 gavetas',
    marca: 'Móveis Europa',
    modelo: 'Bragança',
    estrutura: '100% MDF',
    tipoPortas: 'Correr',
    corredica: 'Corrediça telescópica',
    cabideiro: 'Alumínio',
    espelho: 'Sim'
  },
  // 22. Guarda Roupa Florida 2,07 6 Portas 2 Gavetas (User's specific example!)
  '0c02d580-ca8d-43b7-9f4d-40763d960a68': {
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Mopar',
    modelo: 'Flórida',
    estrutura: 'MDP',
    espessura: '15 mm',
    peso: '134',
    tipoPortas: 'Bater',
    corredica: 'Corrediça telescópica',
    cabideiro: 'Alumínio',
    puxadores: 'MDF',
    espelho: 'Não',
    acabamento: 'Pintura UV',
    altura: '216',
    largura: '207',
    profundidade: '45'
  },
  // 23. Cozinha Compacta 6 Portas 1 Gaveta com Tampo Dália New Cadorin
  '00c3f0d7-8ccd-4808-8802-79055e967332': {
    portas: '6 portas',
    gavetas: '1 gaveta',
    marca: 'Cadorin',
    modelo: 'Dália New',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    acabamento: 'Pintura UV',
    altura: '194',
    largura: '180',
    profundidade: '53',
    peso: '66'
  },
  // 24. Cozinha Compacta 8 Portas 2 Gavetas Grazi Cadorin Móveis
  '72020dcc-fb0a-4982-a12d-a8d2fc434df4': {
    portas: '8 portas',
    gavetas: '2 gavetas',
    marca: 'Cadorin',
    modelo: 'Grazi',
    estrutura: 'MDP',
    espessura: '15 mm',
    tipoPortas: 'Bater + Basculante',
    corredica: 'Corrediça metálica simples',
    pesRegulaveis: 'Sim',
    puxadores: 'Plástico / ABS',
    altura: '200',
    largura: '186',
    profundidade: '53',
    peso: '80.8',
    targetCategoryId: 'b3a1a235-fd4c-4706-a058-6f8200b3731a' // Move to Cozinhas Moduladas e Compactas
  },
  // 25. Cozinha Modulada Florença 6 Peças 100% MDF
  '5d61e058-002e-49d7-9b3d-e4bae4d03d5e': {
    portas: '14 portas',
    gavetas: '3 gavetas',
    marca: 'Móveis Sul',
    modelo: 'Florença',
    estrutura: '100% MDF',
    tipoPortas: 'Bater + Basculante',
    corredica: 'Corrediça telescópica',
    acabamento: 'Pintura UV',
    pesRegulaveis: 'Sim',
    puxadores: 'Alumínio / Metal'
  },
  '8ce4da89-ef4a-4a70-b71a-2a53266a53f1': {
    portas: '14 portas',
    gavetas: '3 gavetas',
    marca: 'Móveis Sul',
    modelo: 'Florença',
    estrutura: '100% MDF',
    tipoPortas: 'Bater + Basculante',
    corredica: 'Corrediça telescópica',
    acabamento: 'Pintura UV',
    pesRegulaveis: 'Sim',
    puxadores: 'Alumínio / Metal'
  },
  // 26. Cozinha Modulada Tunísia 2,63m
  '9193bcb1-ff4e-47ed-b8d6-60aca392b9e2': {
    portas: '11 portas',
    gavetas: '3 gavetas',
    marca: 'Atualle',
    modelo: 'Tunísia',
    estrutura: 'MDF/MDP',
    espessura: '15 mm',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    peso: '131.9',
    altura: '213',
    largura: '263',
    profundidade: '53'
  },
  // 27. Cozinha Modulada Indekes Star
  'ad84c244-3090-4bf8-b7d3-4a7493d77fa2': {
    portas: '12 portas',
    gavetas: '2 gavetas',
    marca: 'Indekes',
    modelo: 'Star',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    peso: '140.6',
    pes: 'Plástico / ABS'
  },
  // 28. Jogo de Cozinha Modulado 4 Peças 2,00 m
  'afd21b58-8f80-4869-9997-8fae7a1aa5fc': {
    portas: '10 portas',
    gavetas: '2 gavetas',
    altura: '217',
    largura: '200',
    profundidade: '53',
    marca: 'Indekes',
    modelo: 'Star',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Corrediça metálica simples',
    peso: '151.8',
    puxador: 'Perfil'
  },
  // 29. Cozinha Modulada Divina MGM 2,70m Pecas
  '12d381a7-236f-46cc-bcb3-70bf167cde2a': {
    portas: '12 portas',
    gavetas: '2 gavetas',
    altura: '223.5',
    largura: '270',
    profundidade: '52',
    marca: 'MGM',
    modelo: 'Divina',
    estrutura: 'MDP',
    tipoPortas: 'Bater + Basculante',
    targetCategoryId: 'b3a1a235-fd4c-4706-a058-6f8200b3731a'
  },
  // 30. Guarda Roupa Casal 2,75m Ripado com Espelho Em MDF Vitoria
  'a889a36b-8aa5-4b28-9063-462d8c10dd63': {
    portas: '3 portas',
    gavetas: '6 gavetas',
    marca: 'Móveis Europa',
    modelo: 'Vitória',
    estrutura: '100% MDF',
    tipoPortas: 'Correr',
    corredica: 'Corrediça telescópica',
    espelho: 'Sim',
    cabideiro: 'Alumínio',
    calceiro: 'Sim',
    peso: '255'
  },
  // 31. Guarda Roupa Evidencia New Monaco 6pt 12gv Preto
  'c30fb474-b911-4908-a125-a5a4ca878f6a': {
    portas: '6 portas',
    gavetas: '12 gavetas',
    altura: '183',
    largura: '183',
    profundidade: '40',
    marca: 'Evidência',
    modelo: 'New Mônaco',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    espelho: 'Não'
  },
  // 32. Guarda Roupa Solteiro 6 Portas Sidney Doripel
  'a83d234b-9682-434e-bac3-3c9808d168b2': {
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Doripel',
    modelo: 'Sidney',
    estrutura: 'MDP',
    tipoPortas: 'Bater',
    corredica: 'Guia plástica',
    cabideiro: 'Madeira',
    puxadores: 'Plástico / ABS',
    altura: '175',
    largura: '137',
    profundidade: '38',
    peso: '62',
    espelho: 'Não'
  },
  // 33. Guarda Roupa Atualle Sao Paulo
  'defacf2b-29de-4f9d-b6a8-c390f0230876': {
    altura: '226',
    largura: '218.5',
    profundidade: '47',
    portas: '6 portas',
    gavetas: '3 gavetas',
    marca: 'Atualle',
    modelo: 'São Paulo',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 34. Balcao para Pia Cadorin Laura 120cm
  'd21b9a4b-c8e4-4c62-a0e7-a2cf4e172e7c': {
    altura: '88.5',
    largura: '120',
    profundidade: '51',
    portas: '2 portas',
    gavetas: '3 gavetas',
    marca: 'Cadorin',
    modelo: 'Laura',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 35. Guarda Roupa Doripel Montevideu
  'aa7cb89d-a3b3-4899-9c63-910926a5177c': {
    altura: '175',
    largura: '137',
    profundidade: '38',
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Doripel',
    modelo: 'Montevideu',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 36. Balcao de Pia Luciane Isis 120cm
  '5e67172a-2909-4b8f-bbe5-37b6fff5d0d1': {
    altura: '84',
    largura: '120',
    profundidade: '53',
    portas: '3 portas',
    gavetas: '2 gavetas',
    marca: 'Luciane',
    modelo: 'Isis',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 37. Comoda Evidencia Cp25
  '4f0c805a-cbc9-49e0-8be2-7ae2d7c10b76': {
    altura: '93',
    largura: '123',
    profundidade: '40',
    portas: '2 portas',
    gavetas: '5 gavetas',
    marca: 'Evidência',
    modelo: 'CP25',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 38. G ROUPA DEMOBILE CADIS 4PT 6GV
  '293f82ef-0ea1-459f-8060-2a8e5cbe6a27': {
    altura: '217',
    largura: '200',
    profundidade: '47',
    portas: '4 portas',
    gavetas: '6 gavetas',
    marca: 'Demóbile',
    modelo: 'Cádis',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 39. Guarda Roupa Made Marcs Atlanta
  '475b8290-6320-4d1d-8bd6-3bdda428d06a': {
    altura: '218',
    largura: '206',
    profundidade: '51',
    portas: '2 portas',
    gavetas: '4 gavetas',
    marca: 'Made Marcs',
    modelo: 'Atlanta',
    estrutura: 'MDP',
    tipoPortas: 'Correr'
  },
  // 40. Comoda Infantil Henn Aconchego
  'ca82da46-22b2-4f7d-a54f-43a05b574172': {
    altura: '103',
    largura: '126.5',
    profundidade: '51',
    portas: '1 porta',
    gavetas: '4 gavetas',
    marca: 'Henn',
    modelo: 'Aconchego',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 41. Guarda Roupa Faimec Salvador
  '9d200152-002d-4b1a-aeed-10e2b2e0b121': {
    altura: '218',
    largura: '208',
    profundidade: '45',
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Faimec',
    modelo: 'Salvador',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 42. Guarda Roupa Doripel New Xangai
  '2137aa68-63fc-4590-86d7-05549c1e78e9': {
    altura: '200',
    largura: '180',
    profundidade: '47',
    portas: '6 portas',
    gavetas: '2 gavetas',
    marca: 'Doripel',
    modelo: 'New Xangai',
    estrutura: '100% MDF',
    tipoPortas: 'Bater'
  },
  // 43. Guarda Roupa Thb Splendore Glass
  '0bba8b5a-581f-4531-9b76-7c2e214bddf2': {
    altura: '206',
    largura: '181',
    profundidade: '49',
    portas: '4 portas',
    gavetas: '2 gavetas',
    marca: 'THB',
    modelo: 'Splendore Glass',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 44. Guarda Roupa Notavel Nt5015
  'e5a0823a-91f5-401f-9f9e-98305260df7c': {
    altura: '187',
    largura: '161',
    profundidade: '44',
    portas: '4 portas',
    gavetas: '3 gavetas',
    marca: 'Notável Móveis',
    modelo: 'NT 5015',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 45. Cozinha Modulada 2,00m JK
  'b4dc0852-40c5-414f-ac66-4adf5f650795': {
    altura: '200',
    largura: '200',
    profundidade: '52.5',
    portas: '9 portas',
    gavetas: '3 gavetas',
    marca: 'JK',
    modelo: 'JK Modulada',
    estrutura: 'MDP',
    tipoPortas: 'Bater'
  },
  // 46. Cama Box Conjugado Solteiro 88cm D28 Cristalflex
  'a846c89e-1b6d-4f41-8142-34a97b0c9d17': {
    portas: '0 portas',
    gavetas: '0 gavetas',
    targetCategoryId: 'c2e94000-f3ce-4c4f-80f7-ee0476793a59',
    removeCategoryIds: ['1859e792-0790-4554-b269-e3b0b707896e']
  }
};

const BRANDS = [
  'Mopar', 'Faimec', 'Moval', 'Doripel', 'Darmovel', 'Castro', 'Móveis Sul', 'Moveis Sul',
  'Indekes', 'Evidência', 'Evidencia', 'Aramóveis', 'Aramoveis', 'Cadorin', 'JK',
  'Notável Móveis', 'Notável Moveis', 'Notavel', 'Qmovi', 'Gelius', 'Bianchi', 'Maxel',
  'Damulti', 'Telasul', 'Henn', 'MGM', 'Luciane', 'Móveis Europa', 'Moveis Europa', 'Cristalflex', 'Demóbile', 'Demobile', 'THB'
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
  return 'Móveis Morante';
}

function extractModel(p) {
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
    'Divina', 'Cadis', 'Dulce', 'Lorena', 'Napoli', 'Dubai', 'Apolo', '2030'
  ];

  for (const m of models) {
    const reg = new RegExp(`\\b${m}\\b`, 'i');
    if (reg.test(p.name) || reg.test(p.description || '')) {
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
  return p.name.replace(/guarda[ -]?roupa|cômoda|comoda|balcão|balcao|cozinha compacta|cozinha modulada/gi, '').trim().split(' ')[0] || 'Padrão';
}

function extractDoors(p) {
  const text = `${p.name} ${p.description || ''}`;
  const m = text.match(/(\d+)\s*(?:portas?|pt\b|p\b)/i);
  if (m) {
    const num = parseInt(m[1], 10);
    return num === 1 ? '1 porta' : `${num} portas`;
  }
  return null;
}

function extractDrawers(p) {
  const text = `${p.name} ${p.description || ''}`;
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

  const mAlt = text.match(/altura(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mAlt && (!altura || altura === '0')) {
    let v = mAlt[1].replace(',', '.');
    if (parseFloat(v) < 3.5) v = Math.round(parseFloat(v) * 100).toString();
    altura = v;
  }

  const mLarg = text.match(/largura(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mLarg && (!largura || largura === '0')) {
    let v = mLarg[1].replace(',', '.');
    if (parseFloat(v) < 3.5) v = Math.round(parseFloat(v) * 100).toString();
    largura = v;
  }

  const mProf = text.match(/profundidade(?:\s*externa|\s*total)?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m\b|mm)?/i);
  if (mProf && (!profundidade || profundidade === '0')) {
    let v = mProf[1].replace(',', '.');
    if (parseFloat(v) < 1.5) v = Math.round(parseFloat(v) * 100).toString();
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
  return 'MDP';
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
  return 'Corrediça metálica simples';
}

function extractMirror(p) {
  const text = `${p.name} ${p.description || ''}`;
  if (/sem espelho/i.test(text)) return 'Não';
  if (/com espelho|espelhad[ao]|possui espelho/i.test(text)) return 'Sim';
  return 'Não';
}

const updates = [];

for (const p of products) {
  const override = MANUAL_OVERRIDES[p.id] || {};
  const currentTv = p.techVals || {};

  const doors = override.portas || currentTv['Quantidade de portas'] || extractDoors(p);
  const drawers = override.gavetas || currentTv['Quantidade de gavetas'] || extractDrawers(p) || '0 gavetas';
  const dims = extractDimensions(p);
  const brand = override.marca || (currentTv['Marca'] && currentTv['Marca'] !== 'Não se aplica' ? currentTv['Marca'] : null) || extractBrand(p);
  const model = override.modelo || (currentTv['Modelo'] && currentTv['Modelo'] !== 'Não se aplica' ? currentTv['Modelo'] : null) || extractModel(p);
  const structure = override.estrutura || (currentTv['Material da estrutura'] && currentTv['Material da estrutura'] !== 'Não se aplica' ? currentTv['Material da estrutura'] : null) || extractStructure(p);
  const doorType = override.tipoPortas || (currentTv['Tipo de portas'] && currentTv['Tipo de portas'] !== 'Não se aplica' ? currentTv['Tipo de portas'] : null) || extractDoorType(p);
  const slideType = override.corredica || (currentTv['Tipo/material da corrediça'] && currentTv['Tipo/material da corrediça'] !== 'Não se aplica' ? currentTv['Tipo/material da corrediça'] : null) || extractSlideType(p);
  const mirror = override.espelho || (currentTv['Possui espelho'] && currentTv['Possui espelho'] !== 'Não se aplica' ? currentTv['Possui espelho'] : null) || (
    p.categoryNames.includes('Guarda-Roupas') || p.categoryNames.includes('Cômodas') ? extractMirror(p) : null
  );

  const altura = override.altura || (currentTv['Altura'] && currentTv['Altura'] !== '0' ? currentTv['Altura'] : null) || dims.altura || (p.height && p.height !== '0' ? p.height : null);
  const largura = override.largura || (currentTv['Largura'] && currentTv['Largura'] !== '0' ? currentTv['Largura'] : null) || dims.largura || (p.width && p.width !== '0' ? p.width : null);
  const profundidade = override.profundidade || (currentTv['Profundidade'] && currentTv['Profundidade'] !== '0' ? currentTv['Profundidade'] : null) || dims.profundidade || (p.depth && p.depth !== '0' ? p.depth : null);

  const newTv = {
    ...currentTv,
    'Cor': currentTv['Cor'] ?? null,
    'Marca': brand,
    'Modelo': model,
    'Altura': String(altura || ''),
    'Largura': String(largura || ''),
    'Profundidade': String(profundidade || ''),
    'Material da estrutura': structure,
    'Tipo de portas': doors === '0 portas' ? null : doorType,
    'Quantidade de portas': doors,
    'Quantidade de gavetas': drawers,
    'Tipo/material da corrediça': drawers === '0 gavetas' ? null : slideType,
  };

  if (mirror) newTv['Possui espelho'] = mirror;
  if (override.peso || (currentTv['Peso'] && currentTv['Peso'] !== 0)) newTv['Peso'] = override.peso || currentTv['Peso'];
  if (override.espessura || currentTv['Espessura do MDF/MDP']) newTv['Espessura do MDF/MDP'] = override.espessura || currentTv['Espessura do MDF/MDP'];
  if (override.cabideiro || currentTv['Material do cabideiro']) newTv['Material do cabideiro'] = override.cabideiro || currentTv['Material do cabideiro'];
  if (override.puxadores || currentTv['Material dos puxadores']) newTv['Material dos puxadores'] = override.puxadores || currentTv['Material dos puxadores'];
  if (override.pes || currentTv['Material dos pés']) newTv['Material dos pés'] = override.pes || currentTv['Material dos pés'];
  if (override.pesRegulaveis || currentTv['Pés reguláveis']) newTv['Pés reguláveis'] = override.pesRegulaveis || currentTv['Pés reguláveis'];
  if (override.acabamento || currentTv['Acabamento']) newTv['Acabamento'] = override.acabamento || currentTv['Acabamento'];
  if (override.tampo || currentTv['Acompanha tampo']) newTv['Acompanha tampo'] = override.tampo || currentTv['Acompanha tampo'];
  if (override.pia || currentTv['Acompanha pia / cuba']) newTv['Acompanha pia / cuba'] = override.pia || currentTv['Acompanha pia / cuba'];

  // Clean "Não se aplica" from keys where we now have real values
  for (const k of Object.keys(newTv)) {
    if (newTv[k] === 'Não se aplica' || newTv[k] === null && k !== 'Cor') {
      delete newTv[k];
    }
  }

  // Variations updates
  const variationSqls = [];
  for (const v of p.variations) {
    let currentAttrs = v.attributes || {};
    if (!currentAttrs.Cor) {
      let color = null;
      const vName = v.name || '';
      if (vName.includes(p.name)) {
        color = vName.replace(p.name, '').trim();
      } else {
        const parts = vName.split(' ');
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes('/') || parts.length > 2) {
          color = parts.slice(-2).join(' ');
        }
      }
      if (color) {
        color = color.replace(/^[-\s]+/, '').trim();
        variationSqls.push({
          id: v.id,
          name: v.name,
          color,
          attributes: { ...currentAttrs, Cor: color }
        });
      }
    }
  }

  updates.push({
    productId: p.id,
    productName: p.name,
    targetCategoryId: override.targetCategoryId,
    removeCategoryIds: override.removeCategoryIds,
    newTv,
    variationSqls
  });
}

fs.writeFileSync('erp/scripts/prepared_updates.json', JSON.stringify(updates, null, 2));
console.log('Prepared updates for', updates.length, 'products.');
