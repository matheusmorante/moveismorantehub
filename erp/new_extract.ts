  // Motor de Desenho Síncrono no Canvas 2D
  const drawBannerSync = (
    canvas: HTMLCanvasElement,
    images: { headerBg: HTMLImageElement | null; footerBg: HTMLImageElement | null; logo: HTMLImageElement | null; mainImg: HTMLImageElement | null; secImg: HTMLImageElement | null; variationImgs: (HTMLImageElement | null)[] },
    isExport = false
  ) => {
    if (!activeProduct && !isEditingTemplate) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width / 1080;
    const reg: Record<string, { key: string; label: string; x: number; y: number; w: number; h: number }> = {};
    const getTextAreaAlignment = (key: string, width: number, height: number) => {
      const background = textBackgrounds[key] || EMPTY_TEXT_BACKGROUND;
      const hasBackground = background.opacity > 0;
      return getTextBackgroundAlignment(
        width,
        height,
        hasBackground ? background.paddingX : 0,
        hasBackground ? background.paddingY : 0,
        textHorizontalAlignments[key] || (hasBackground ? 'center' : 'left'),
        textVerticalAlignments[key] || 'middle',
      );
    };

    // 1. Área principal clara, conforme o template institucional padrão.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1080 * S, 1350 * S);

    // 2. Imagens do Produto (Principal e Secundária)
    const imageGrid = getPostImageGrid(imageGridSettings, images.variationImgs.length);
    reg.mainImage = { ...imageGrid.main, key: 'mainImage', label: 'Célula da imagem 1' };
    reg.secondaryImage = { ...imageGrid.secondary, key: 'secondaryImage', label: 'Célula da imagem 2' };
    const drawImageGridLayer = () => {
      if (images.mainImg) {
        const bb = getCachedBoundingBox(images.mainImg);
        const placement = placeImageInCell(bb, imageGrid.main, 100, 0, 0);
        const targetW = placement.w * S;
        const targetH = placement.h * S;
        const posX = placement.x * S;
        const posY = placement.y * S;

        ctx.save();
        ctx.beginPath();
        ctx.rect(imageGrid.main.x * S, imageGrid.main.y * S, imageGrid.main.w * S, imageGrid.main.h * S);
        ctx.clip();
        ctx.drawImage(
          images.mainImg,
          bb.x, bb.y, bb.w, bb.h,
          posX, posY, targetW, targetH
        );
        ctx.restore();
      }

      if (showSecondaryImage && images.secImg) {
        const bb = getCachedBoundingBox(images.secImg);
        const placement = placeImageInCell(bb, imageGrid.secondary, 100, 0, 0);
        const targetW = placement.w * S;
        const targetH = placement.h * S;
        const posX = placement.x * S;
        const posY = placement.y * S;

        ctx.save();
        ctx.beginPath();
        ctx.rect(imageGrid.secondary.x * S, imageGrid.secondary.y * S, imageGrid.secondary.w * S, imageGrid.secondary.h * S);
        ctx.clip();
        ctx.drawImage(
          images.secImg,
          bb.x, bb.y, bb.w, bb.h,
          posX, posY, targetW, targetH
        );
        ctx.restore();
      }

      images.variationImgs.forEach((variationImage, index) => {
        const cell = imageGrid.variationCells[index];
        if (!variationImage || !cell) return;
        const bb = getCachedBoundingBox(variationImage);
        const placement = placeImageInCell(bb, cell, 100, 0, 0);
        ctx.save();
        ctx.beginPath();
        ctx.rect(cell.x * S, cell.y * S, cell.w * S, cell.h * S);
        ctx.clip();
        ctx.drawImage(variationImage, bb.x, bb.y, bb.w, bb.h, placement.x * S, placement.y * S, placement.w * S, placement.h * S);
        ctx.restore();
      });
    };

    // 3. Cabeçalho (Marca e Slogan)
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 0, 1080 * S, 170 * S);

    if (images.headerBg) {
      ctx.drawImage(images.headerBg, 0, 0, images.headerBg.width, images.headerBg.height, 0, 0, 1080 * S, 170 * S);
    } else {
    const headerGrad = ctx.createLinearGradient(0, 0, 1080 * S, 0);
    headerGrad.addColorStop(0, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.4, "rgba(12, 21, 35, 1)");
    headerGrad.addColorStop(0.7, "rgba(12, 21, 35, 0.4)");
    headerGrad.addColorStop(1, "rgba(12, 21, 35, 0)");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, 1080 * S, 170 * S);

    const brandNameStr = brandName || "MÓVEIS MORANTE";
    const brandSize = brandFontSize || 42;
    const brandX = brandOffsetX ?? 120;
    const brandY = brandOffsetY ?? 82;

    ctx.font = `italic bold ${brandSize * S}px ${textFontFamilies.brand || DEFAULT_FONT_FAMILY}`;
    drawTextBackground(ctx, S, ctx.measureText(brandNameStr).width / S, brandSize, textBackgrounds.brand || EMPTY_TEXT_BACKGROUND, brandX, brandY);
    if (brandNameStr.toUpperCase().startsWith("MÓVEIS MORANTE")) {
      const p1 = "MÓVEIS ";
      const p2 = brandNameStr.substring(7);
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(p1, brandX * S, brandY * S);
      const p1W = ctx.measureText(p1).width;
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(p2, brandX * S + p1W, brandY * S);
    } else {
      ctx.fillStyle = textColors.brand || DEFAULT_TEXT_COLORS.brand;
      ctx.fillText(brandNameStr, brandX * S, brandY * S);
    }

    ctx.strokeStyle = "#e0a96d";
    ctx.lineWidth = 3 * S;
    ctx.beginPath();
    ctx.moveTo(brandX * S, (brandY + 11) * S);
    ctx.lineTo((brandX + 320) * S, (brandY + 11) * S);
    ctx.stroke();

    const sloganText = slogan || "Qualidade que cabe no seu bolso";
    const sloganSize = sloganFontSize || 20;
    const sloganX = sloganOffsetX ?? 120;
    const sloganY = sloganOffsetY ?? 130;

    ctx.fillStyle = textColors.slogan || DEFAULT_TEXT_COLORS.slogan;
    ctx.font = `${sloganSize * S}px ${textFontFamilies.slogan || DEFAULT_FONT_FAMILY}`;
    drawTextBackground(ctx, S, ctx.measureText(sloganText).width / S, sloganSize, textBackgrounds.slogan || EMPTY_TEXT_BACKGROUND, sloganX, sloganY);
    ctx.fillText(sloganText, sloganX * S, sloganY * S);
    }

    // 4. Rodapé
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(0, 1180 * S, 1080 * S, 170 * S);
    if (images.footerBg) ctx.drawImage(images.footerBg, 0, 0, images.footerBg.width, images.footerBg.height, 0, 1180 * S, 1080 * S, 170 * S);

    if (!images.footerBg && images.logo) {
      const aspect = images.logo.width / images.logo.height;
      const targetHeight = 135 * (avatarScale / 100) * S;
      const targetWidth = targetHeight * aspect;
      const aX = (avatarOffsetX ?? 35) * S;
      const aY = (avatarOffsetY ?? 1208) * S;
      ctx.drawImage(images.logo, aX, aY, targetWidth, targetHeight);
      ctx.fillStyle = textColors.footerAddress || DEFAULT_TEXT_COLORS.footerAddress;
      ctx.font = `bold ${(footerAddressTextFontSize || 28) * S}px ${textFontFamilies.footerAddress || DEFAULT_FONT_FAMILY}`;
      const ftAddr = footerAddressText || "RUA CASCAVEL, 306, GUARAITUBA, COLOMBO";
      drawTextBackground(ctx, S, ctx.measureText(ftAddr).width / S, footerAddressTextFontSize || 28, textBackgrounds.footerAddress || EMPTY_TEXT_BACKGROUND, footerAddressTextOffsetX ?? 175, footerAddressTextOffsetY ?? 1302);
      ctx.fillText(ftAddr, (footerAddressTextOffsetX ?? 175) * S, (footerAddressTextOffsetY ?? 1302) * S);
    }

    // 5. Bloco de descrição e preço, abaixo da foto secundária à direita.
    const effectivePrice = customPrice ? parseFloat(customPrice) : renderProduct.price;
    const effectivePromo = customPromoPrice ? parseFloat(customPromoPrice) : renderProduct.promo_price;
    const finalPriceVal = effectivePromo || effectivePrice;
    const priceStr = `R$ ${finalPriceVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const prSize = priceFontSize || 48;
    const prX = priceOffsetX ?? 600;
    const prY = priceOffsetY ?? 920;
    const priceContainerX = priceContainerOffsetX ?? 0;
    const priceContainerY = priceContainerOffsetY ?? 0;
    // O preço principal sempre pertence ao container: ao movê-lo ou aumentar a
    // fonte, o container expande em vez de deixar o conteúdo vazar.
    const isPricePorDetached = false;
    ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
    const priceTextWidth = ctx.measureText(priceStr).width / S;
    const rawPriceRowStartX = 580 + ((priceOffsetX ?? 600) - 600);
    const priceRowStartX = Math.max(18 - priceContainerX, Math.min(rawPriceRowStartX, 1080 - priceContainerX - priceTextWidth - 38));
    const priceRequiredWidth = Math.ceil(priceRowStartX - 560 + priceTextWidth + 54);
    // Enquanto o preço estiver no container, o fundo nunca pode ficar menor que ele.
    const effectiveContainerWidth = isPricePorDetached ? priceContainerWidth : Math.max(priceContainerWidth, priceRequiredWidth);
    const contentLimit = Math.max(120, effectiveContainerWidth - 40);
    const pTitleSize = productTitleFontSize || 30;
    const pTitleLimit = Math.max(120, textSelectionWidths.title || contentLimit);
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    const titleWords = (productTitle || renderProduct.name).split(/\s+/);
    const titleLines: string[] = [];
    let titleLine = '';
    for (const word of titleWords) {
      const nextLine = titleLine ? `${titleLine} ${word}` : word;
      if (titleLine && ctx.measureText(nextLine).width / S > pTitleLimit) { titleLines.push(titleLine); titleLine = word; } else titleLine = nextLine;
    }
    if (titleLine) titleLines.push(titleLine);
    const expandedContainerHeight = Math.max(80, priceContainerHeight);
    const expandedTop = 650;

    if (showPriceContainer) {
      ctx.beginPath();
      ctx.roundRect(560 * S, expandedTop * S, effectiveContainerWidth * S, expandedContainerHeight * S, 26 * S);
      ctx.fillStyle = priceContainerBackgroundColor;
      ctx.fill();
      reg['priceContainer'] = { key: 'priceContainer', label: 'Container de preços', x: 560 + priceContainerX, y: expandedTop + priceContainerY, w: effectiveContainerWidth, h: expandedContainerHeight };
    }

    const contentLeft = 580;
    let contentCursorY = expandedTop + 32;
    const isTitleDetached = Boolean(detachedContainerElements.title);
    const pTitleX = isTitleDetached ? (productTitleOffsetX ?? 600) : contentLeft + ((productTitleOffsetX ?? 600) - 600);
    ctx.font = `bold ${pTitleSize * S}px ${textFontFamilies.title || DEFAULT_FONT_FAMILY}`;
    const pTitleY = isTitleDetached ? (productTitleOffsetY ?? 720) : contentCursorY + pTitleSize + ((productTitleOffsetY ?? 720) - 720);
    ctx.fillStyle = textColors.title || DEFAULT_TEXT_COLORS.title;
    const titleContentWidth = Math.max(...titleLines.map(line => ctx.measureText(line).width / S), 0);
    const titleContentHeight = titleLines.length * (pTitleSize + 6);
    const titleAlignment = getTextAreaAlignment('title', titleContentWidth, titleContentHeight);
    const drawTitleLayer = () => {
      ctx.save();
      if (!isTitleDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
      ctx.translate((pTitleX + titleAlignment.x) * S, (pTitleY + titleAlignment.y) * S);
      ctx.rotate((productTitleRotation * Math.PI) / 180);
      drawTextBackground(ctx, S, titleContentWidth, titleContentHeight, textBackgrounds.title || EMPTY_TEXT_BACKGROUND, 0, titleContentHeight - pTitleSize, { ...titleAlignment, offsetX: titleAlignment.x, offsetY: titleAlignment.y });
      titleLines.forEach((line, index) => ctx.fillText(line, 0, index * (pTitleSize + 6) * S));
      ctx.restore();
      reg['title'] = { key: 'title', label: 'Título Produto', x: pTitleX, y: pTitleY - pTitleSize, w: titleAlignment.width, h: titleAlignment.height };
    };
    if (!isTitleDetached) contentCursorY = pTitleY + titleHeight + 16;

    if (shouldShowPreviousPrice(effectivePrice, effectivePromo, isEditingTemplate)) {
      const deLabel = priceDeText || 'De';
      const deStr = `R$ ${effectivePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const deSize = priceDeFontSize || 20;
      const isPriceDeDetached = Boolean(detachedContainerElements.priceDe);
      const deX = isPriceDeDetached ? (priceDeOffsetX ?? 600) : contentLeft + ((priceDeOffsetX ?? 600) - 600);
      const deY = isPriceDeDetached ? (priceDeOffsetY ?? 780) : contentCursorY + deSize + ((priceDeOffsetY ?? 780) - 780);
      const drawPriceDeLayer = () => {
        ctx.save();
        if (!isPriceDeDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
        ctx.translate(deX * S, deY * S);
        ctx.rotate((priceDeRotation * Math.PI) / 180);
        ctx.fillStyle = textColors.priceDeLabel || DEFAULT_TEXT_COLORS.priceDeLabel;
        ctx.font = `bold ${deSize * S}px ${textFontFamilies.priceDeLabel || DEFAULT_FONT_FAMILY}`;
        const deLabelWidth = ctx.measureText(deLabel).width / S;
        const deLabelAlignment = getTextAreaAlignment('priceDeLabel', deLabelWidth, deSize);
        drawTextBackground(ctx, S, deLabelWidth, deSize, textBackgrounds.priceDeLabel || EMPTY_TEXT_BACKGROUND, deLabelAlignment.x, deLabelAlignment.y, { ...deLabelAlignment, offsetX: deLabelAlignment.x, offsetY: deLabelAlignment.y });
        ctx.fillText(deLabel, deLabelAlignment.x * S, deLabelAlignment.y * S);
        ctx.restore();
        reg['priceDeLabel'] = { key: 'priceDeLabel', label: 'Texto De', x: deX, y: deY - deSize, w: deLabelAlignment.width, h: deLabelAlignment.height };
      };
      const drawPriceDeValueLayer = () => {
        ctx.save();
        if (!isPriceDeDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
        ctx.translate(deX * S, deY * S);
        ctx.rotate((priceDeRotation * Math.PI) / 180);
        ctx.fillStyle = textColors.priceDe || DEFAULT_TEXT_COLORS.priceDe;
        ctx.font = `bold ${deSize * S}px ${textFontFamilies.priceDe || DEFAULT_FONT_FAMILY}`;
        const deWidth = ctx.measureText(deStr).width / S;
        const deAlignment = getTextAreaAlignment('priceDe', deWidth, deSize);
        const deLabelWidth = ctx.measureText(deLabel).width / S;
        const deBaseX = deLabelWidth + 8;
        drawTextBackground(ctx, S, deWidth, deSize, textBackgrounds.priceDe || EMPTY_TEXT_BACKGROUND, deBaseX + deAlignment.x, deAlignment.y, { ...deAlignment, offsetX: deAlignment.x, offsetY: deAlignment.y });
        ctx.fillText(deStr, (deBaseX + deAlignment.x) * S, deAlignment.y * S);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo((deBaseX + deAlignment.x) * S, (deAlignment.y - deSize * 0.3) * S);
        ctx.lineTo((deBaseX + deAlignment.x + deWidth) * S, (deAlignment.y - deSize * 0.3) * S);
        ctx.stroke();
        ctx.restore();
        reg['priceDe'] = { key: 'priceDe', label: 'Preço antigo', x: deX + deBaseX, y: deY - deSize, w: deAlignment.width, h: deAlignment.height };
      };
      if (!isPriceDeDetached) contentCursorY = deY + 16;
    }

    const porApStr = porApenasText || "POR APENAS";
    const porApSize = porApenasFontSize || 16;
    const priceRowX = isPricePorDetached ? (priceOffsetX ?? 600) : priceRowStartX;
    const rawPriceRowY = contentCursorY + prSize + 18 + ((priceOffsetY ?? 920) - 920);
    const priceRowY = isPricePorDetached ? (priceOffsetY ?? 920) : Math.max(prSize + 18, Math.min(rawPriceRowY, 1330 - priceContainerY));
    ctx.font = `bold ${porApSize * S}px ${textFontFamilies.porApenas || DEFAULT_FONT_FAMILY}`;
    const porApWidth = ctx.measureText(porApStr).width / S;
    // “Por apenas” é independente: não pertence ao container de preços.
    const porApX = porApenasOffsetX ?? (priceRowX - porApWidth - 14);
    const porApY = porApenasOffsetY ?? (priceRowY - (prSize - porApSize) / 2);
    const porAlignment = getTextAreaAlignment('porApenas', porApWidth, porApSize);
    const drawPorApenasLayer = () => {
      ctx.fillStyle = textColors.porApenas || porApenasColor || DEFAULT_TEXT_COLORS.porApenas;
      ctx.font = `bold ${porApSize * S}px ${textFontFamilies.porApenas || DEFAULT_FONT_FAMILY}`;
      ctx.save();
      // ctx.translate(-priceContainerX * S, -priceContainerY * S); // Removido
      ctx.translate((porApX + porAlignment.x) * S, (porApY + porAlignment.y) * S);
      ctx.rotate((porApenasRotation * Math.PI) / 180);
      drawTextBackground(ctx, S, porApWidth, porApSize, textBackgrounds.porApenas || EMPTY_TEXT_BACKGROUND, 0, 0, { ...porAlignment, offsetX: porAlignment.x, offsetY: porAlignment.y });
      ctx.fillText(porApStr, 0, 0);
      ctx.restore();
      reg['porApenas'] = { key: 'porApenas', label: 'Texto Por Apenas', x: porApX, y: porApY - porApSize, w: porAlignment.width, h: porAlignment.height };
    };

    ctx.font = `bold ${prSize * S}px ${textFontFamilies.pricePor || DEFAULT_FONT_FAMILY}`;
    const flowPriceX = isPricePorDetached ? (priceOffsetX ?? 600) : priceRowX;
    const flowPriceY = isPricePorDetached ? (priceOffsetY ?? 920) : priceRowY;
    const priceContentWidth = ctx.measureText(priceStr).width / S;
    const priceAlignment = getTextAreaAlignment('pricePor', priceContentWidth, prSize);
    const drawPricePorLayer = () => {
      ctx.save();
      if (!isPricePorDetached) ctx.translate(priceContainerX * S, priceContainerY * S);
      ctx.translate((flowPriceX + priceAlignment.x) * S, (flowPriceY + priceAlignment.y) * S);
      ctx.rotate((priceRotation * Math.PI) / 180);
      // Aqui usamos o textBackgrounds.pricePor como estava
      let defaultBg = { color: '#ffe600', paddingLeft: 18, paddingRight: 18, paddingTop: 17, paddingBottom: 17, opacity: 1 };
      // Mas com fallbacks corretos caso não seja esse. Se não for vazio:
      drawTextBackground(ctx, S, priceContentWidth, prSize, textBackgrounds.pricePor || defaultBg, 0, 0, { ...priceAlignment, offsetX: priceAlignment.x, offsetY: priceAlignment.y });
      ctx.fillStyle = textColors.pricePor || DEFAULT_TEXT_COLORS.pricePor;
      ctx.fillText(priceStr, 0, 0);
      ctx.restore();
      reg['pricePor'] = { key: 'pricePor', label: 'Preço POR', x: flowPriceX, y: flowPriceY - prSize, w: priceAlignment.width, h: priceAlignment.height };
    };
    if (!isPricePorDetached) contentCursorY = flowPriceY + 34;

    // Medidas
    if (measuresText) {
      const mSize = measuresFontSize || 20;
      const mX = measuresOffsetX ?? 785;
      const mY = measuresOffsetY ?? 1035;
      ctx.fillStyle = textColors.measures || DEFAULT_TEXT_COLORS.measures;
      ctx.font = `bold ${mSize * S}px ${textFontFamilies.measures || DEFAULT_FONT_FAMILY}`;
      const measuresWidth = ctx.measureText(measuresText).width / S;
      const measuresAlignment = getTextAreaAlignment('measures', measuresWidth, mSize);
      const drawMeasuresLayer = () => {
        ctx.save();
        drawTextBackground(ctx, S, measuresWidth, mSize, textBackgrounds.measures || EMPTY_TEXT_BACKGROUND, mX + measuresAlignment.x, mY + measuresAlignment.y, { ...measuresAlignment, offsetX: measuresAlignment.x, offsetY: measuresAlignment.y });
        ctx.fillText(measuresText, (mX + measuresAlignment.x) * S, (mY + measuresAlignment.y) * S);
        ctx.restore();
        reg['measures'] = { key: 'measures', label: 'Medidas', x: mX, y: mY - mSize, w: measuresAlignment.width, h: measuresAlignment.height };
      };
    }
    for (const key of [...CONTAINER_CHILD_KEYS, 'priceHighlight']) {
      if (reg[key] && !detachedContainerElements[key]) {
        reg[key].x += priceContainerX;
        reg[key].y += priceContainerY;
      }
    }

    // Parcelamento é um elemento independente do Container de preços.
    const instText = installmentsText || "Em até 10x sem juros no cartão";
    const instSize = installmentsFontSize || 26;
    const instX = installmentsOffsetX ?? 540;
    const instY = installmentsOffsetY ?? 1140;
    ctx.fillStyle = textColors.installments || DEFAULT_TEXT_COLORS.installments;
    ctx.font = `${instSize * S}px ${textFontFamilies.installments || DEFAULT_FONT_FAMILY}`;
    const installmentsWidth = ctx.measureText(instText).width / S;
    const installmentsAlignment = getTextAreaAlignment('installments', installmentsWidth, instSize);
    drawTextBackground(ctx, S, installmentsWidth, instSize, textBackgrounds.installments || EMPTY_TEXT_BACKGROUND, instX + installmentsAlignment.x, instY + installmentsAlignment.y, { ...installmentsAlignment, offsetX: installmentsAlignment.x, offsetY: installmentsAlignment.y });
    ctx.fillText(instText, (instX + installmentsAlignment.x) * S, (instY + installmentsAlignment.y) * S);
    reg['installments'] = { key: 'installments', label: 'Parcelas', x: instX, y: instY - instSize, w: installmentsAlignment.width, h: installmentsAlignment.height };

    // 7. Oportunidade
    if (showOpportunityBadge && (selectedOpportunitySeal || renderProduct.opportunities)) {
      const opp = selectedOpportunitySeal || renderProduct.opportunities!;
      const labelText = opp.name.toUpperCase();
      ctx.save();
      const bx = oppOffsetX * S;
      const by = oppOffsetY * S;
      ctx.translate(bx, by);
      ctx.rotate((oppRotation * Math.PI) / 180);
      const currentScale = (oppScale / 100) * S;
      ctx.scale(currentScale, currentScale);

      ctx.font = `bold 20px 'Segoe UI', Arial, sans-serif`;
      const textW = ctx.measureText(labelText).width;
      const isSalvados = opp.name.toLowerCase().includes("salvado");
      const iconSpace = isSalvados ? 28 : 0;
      const badgeW = textW + 30 + iconSpace;
      const badgeH = 44;

      ctx.fillStyle = isSalvados ? "#f97316" : resolveBadgeColor(opp.badge_color || '');
      const rx = -badgeW / 2;
      const ry = -badgeH / 2;
      const radius = 8;

      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + badgeW - radius, ry);
      ctx.quadraticCurveTo(rx + badgeW, ry, rx + badgeW, ry + radius);
      ctx.lineTo(rx + badgeW, ry + badgeH - radius);
      ctx.quadraticCurveTo(rx + badgeW, ry + badgeH, rx + badgeW - radius, ry + badgeH);
      ctx.lineTo(rx + radius, ry + badgeH);
      ctx.quadraticCurveTo(rx, ry + badgeH, rx, ry + badgeH - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      ctx.fill();

      if (opp.border_color) {
        ctx.strokeStyle = opp.border_color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (isSalvados) {
        drawFlameIcon(ctx, rx + 15, ry + 12, 20, "#000000");
      }

      ctx.fillStyle = isSalvados ? "#000000" : "#ffffff";
      ctx.font = `bold 16px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, isSalvados ? iconSpace / 2 : 0, 0);
      ctx.restore();

      const scaleFactor = (oppScale / 100);
      reg['opportunityBadge'] = {
        key: 'opportunityBadge',
        label: 'Selo de oportunidade',
        x: oppOffsetX - (badgeW * scaleFactor) / 2 - 6,
        y: oppOffsetY - (badgeH * scaleFactor) / 2 - 6,
        w: badgeW * scaleFactor + 12,
        h: badgeH * scaleFactor + 12
      };
    }


    const layerDrawFns: Record<string, () => void> = {
      imageGrid: typeof drawImageGridLayer !== 'undefined' ? drawImageGridLayer : undefined,
      title: typeof drawTitleLayer !== 'undefined' ? drawTitleLayer : undefined,
      priceDeLabel: typeof drawPriceDeLayer !== 'undefined' ? drawPriceDeLayer : undefined,
      priceDe: typeof drawPriceDeValueLayer !== 'undefined' ? drawPriceDeValueLayer : undefined,
      porApenas: typeof drawPorApenasLayer !== 'undefined' ? drawPorApenasLayer : undefined,
      pricePor: typeof drawPricePorLayer !== 'undefined' ? drawPricePorLayer : undefined,
      measures: typeof drawMeasuresLayer !== 'undefined' ? drawMeasuresLayer : undefined,
      installments: typeof drawInstallmentsLayer !== 'undefined' ? drawInstallmentsLayer : undefined,
      opportunityBadge: typeof drawOpportunityLayer !== 'undefined' ? drawOpportunityLayer : undefined,
    };

    const drawOrder = [...layerOrder].reverse();
    drawOrder.forEach(key => {
      if (layerDrawFns[key]) layerDrawFns[key]();
    });

    if (!isExport) {
      if (imageGridSettings.showGuides) drawImageGrid(ctx, S, imageGrid);
      const gridSelectionMargin = 24;
      reg.imageGrid = { key: 'imageGrid', label: 'Grid de fotos', x: imageGrid.outer.x - gridSelectionMargin, y: imageGrid.outer.y - gridSelectionMargin, w: imageGrid.outer.w + gridSelectionMargin * 2, h: imageGrid.outer.h + gridSelectionMargin * 2 };
    }
    if (variationGridImages?.hasMoreColors) {
      const lastPhotoCell = imageGrid.variationCells[images.variationImgs.length - 1] || imageGrid.secondary;
      drawMoreColorsLabel(ctx, S, lastPhotoCell, imageGridSettings);
    }

    // 8. Destaque do elemento selecionado em tela
    if (selectedElement && !isExport) {
      const region = reg[selectedElement];
      if (region) {
        ctx.save();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 * S;
        ctx.strokeRect(region.x * S, region.y * S, region.w * S, region.h * S);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2 * S;
        if (selectedElement === 'priceContainer') {
          const handleColor = "#2563eb";
          ctx.strokeStyle = handleColor;
          ctx.lineWidth = 6 * S;
          ctx.beginPath();
          ctx.moveTo(region.x * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo(region.x * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w) * S, (region.y + region.h / 2 - 35) * S); ctx.lineTo((region.x + region.w) * S, (region.y + region.h / 2 + 35) * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, region.y * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, region.y * S);
          ctx.moveTo((region.x + region.w / 2 - 50) * S, (region.y + region.h) * S); ctx.lineTo((region.x + region.w / 2 + 50) * S, (region.y + region.h) * S);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.lineWidth = 3 * S;
          [[region.x, region.y + region.h / 2], [region.x + region.w, region.y + region.h / 2], [region.x + region.w / 2, region.y], [region.x + region.w / 2, region.y + region.h]].forEach(([handleX, handleY]) => {
            ctx.fillRect((handleX - 7) * S, (handleY - 7) * S, 14 * S, 14 * S);
            ctx.strokeRect((handleX - 7) * S, (handleY - 7) * S, 14 * S, 14 * S);
          });
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        } else if (IMAGE_CELL_KEYS.includes(selectedElement)) {
          // Células do grid exibem somente a borda de seleção.
        } else if (TEXT_ELEMENT_KEYS.includes(selectedElement)) {
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 2 * S;
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        } else {
          ctx.lineWidth = 3 * S;
          [[region.x, region.y + region.h / 2], [region.x + region.w, region.y + region.h / 2], [region.x + region.w / 2, region.y], [region.x + region.w / 2, region.y + region.h]].forEach(([handleX, handleY]) => {
            ctx.fillRect((handleX - 6) * S, (handleY - 6) * S, 12 * S, 12 * S);
            ctx.strokeRect((handleX - 6) * S, (handleY - 6) * S, 12 * S, 12 * S);
          });
          ctx.fillRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
          ctx.strokeRect((region.x + region.w - 9) * S, (region.y + region.h - 9) * S, 18 * S, 18 * S);
        }
        if (!IMAGE_CELL_KEYS.includes(selectedElement)) {
          const rotateX = region.x + region.w + 42;
          const rotateY = region.y + region.h + 42;
          ctx.beginPath();
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(rotateX * S, rotateY * S, 11 * S, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#2563eb";
          ctx.font = `bold ${15 * S}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("↻", rotateX * S, rotateY * S + 1 * S);
        }
        ctx.restore();
      }
    }

    renderedRegionsRef.current = reg;
  };

