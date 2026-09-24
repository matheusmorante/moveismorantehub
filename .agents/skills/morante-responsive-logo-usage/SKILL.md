---
name: morante-responsive-logo-usage
description: Escolhe entre a marca M, a logo horizontal e a logo completa conforme o espaço disponível em cabeçalhos, telas responsivas, favicons, ícones e splash screens do Morante Hub. Use sempre que inserir, trocar, dimensionar ou adaptar uma logo.
---

# Uso responsivo das logos Móveis Morante

## Quando aplicar esta Skill

Use sempre que uma tela ou componente do ERP, App Mobile ou Catálogo Digital inserir, trocar ou redimensionar uma logo, inclusive durante replicação e adaptação responsiva.

## Quando NÃO aplicar

Não aplique a elementos que não sejam a identidade da Móveis Morante, como avatares pessoais, logos de fornecedores ou marcas de terceiros.

## Escolha da variante

Escolha pela área real ocupada pela logo e pelo que continuará legível. A largura da tela ajuda a escolher a variante responsiva, mas não substitui a avaliação do espaço reservado no componente.

| Variante | Use quando | Evite quando |
|---|---|---|
| **Marca M** (`brand-mark.svg`) | O espaço é pequeno ou estreito: favicon, ícone, avatar institucional, navegação compacta ou marca abaixo de aproximadamente 64 × 48 px. Em cabeçalhos mobile estreitos, prefira esta versão. | A área é larga e permite ler “Móveis Morante”. |
| **Logo horizontal** (`logo-morante-horizontal.svg`) | O container é largo e baixo: cabeçalho, barra superior ou faixa horizontal. Preserve a proporção; não amplie a altura para preencher um header baixo. | O texto ficaria ilegível por falta de largura; nesse caso use a marca M. |
| **Logo completa** (`logo-morante.svg`) | A área é ampla e alta, como uma apresentação de marca, splash screen ou hero/landing page onde o símbolo da casa, o nome e o subtítulo possam respirar. | Cabeçalhos, menus compactos, ícones ou containers baixos. |

Para web, a convenção atual é usar a marca M abaixo de 640 px em cabeçalhos e a logo horizontal a partir de 640 px. Ajuste esse breakpoint se o container real não comportar a variante. Em React Native, use a largura disponível (`useWindowDimensions`) para seguir a mesma intenção; não troque para a logo horizontal quando os controles vizinhos deixarem pouco espaço.

## Arquivos por aplicação

- **ERP:** `erp/src/assets/brand-mark.svg`, `erp/src/assets/logo-morante-horizontal.svg` e `erp/src/assets/logo-morante.svg`; favicons compactos em `erp/public/favicon.svg` e `erp/public/favicon.png`.
- **Catálogo Digital:** `digital-catalog/public/images/morante-mark-192.png` e `morante-mark-512.png`, `digital-catalog/public/logo-morante-horizontal.svg` e `digital-catalog/public/logo-morante.svg`; o favicon M do Next fica em `digital-catalog/src/app/icon.svg` e `icon.png`.
- **App Mobile:** variantes SVG em `mobile/assets/brand-mark.svg`, `logo-morante-horizontal.svg` e `logo-morante.svg`; os ícones pequenos usam `icon.png`/`favicon.png`, e o splash usa `splash-logo.png` derivada da logo completa. `mobile/src/assets/moranteBrandMarkSvg.ts` e `moranteHorizontalLogoSvg.ts` são cópias embutidas para renderização por `SvgXml`.

Mantenha cada variante separada. Ao atualizar o desenho de uma variante, sincronize suas cópias entre as aplicações; não substitua a logo completa por uma versão compacta nem derive uma variante recortando ou esticando outra. Gere PNG somente para plataformas ou configurações que precisam de raster e mantenha o SVG como fonte vetorial.

## Implementação e validação

- Use `object-fit: contain` ou `preserveAspectRatio="xMidYMid meet"`; nunca distorça, corte ou cubra partes do desenho.
- Prefira seleção responsiva explícita (`picture`/breakpoint em web; largura disponível em React Native) para que cada tamanho receba a variante correta.
- Confirme em tamanhos representativos que o M continua reconhecível, que a logo horizontal permanece legível e que a completa não fica espremida.
- Aplique a política de teste focado de `AGENTS.md`; validação visual é indicada quando a escolha depende de responsividade ou legibilidade.

## Referências e Fonte Canônica de Documentação

- `AGENTS.md`: gatilho obrigatório para mudanças em logos e identidades compactas.
- `erp-web-to-mobile-replication`: composição desta skill ao reproduzir logos do ERP no App Mobile.
