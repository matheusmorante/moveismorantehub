export const DANFE_NFCE_A4_PAGINATION_SCRIPT = `
(() => {
  const root = document.querySelector('.danfe-pages');
  const template = root && root.querySelector('.danfe-page');
  if (!root || !template) return;

  const sourceHeader = template.querySelector('.document-header');
  const sourceConsumer = template.querySelector('.consumer-card');
  const sourceItems = template.querySelector('.page-items');
  const sourceTitle = sourceItems && sourceItems.querySelector('.products-title');
  const sourceTable = sourceItems && sourceItems.querySelector('.items-table');
  const sourceFooter = template.querySelector('.page-footer-core');
  const sourceInfo = template.querySelector('.additional-info-section');
  const sourceRows = sourceTable ? Array.from(sourceTable.tBodies[0].rows) : [];
  const sourceStripe = template.querySelector('.homologation-stripe');
  const heightOf = (element) => element ? element.getBoundingClientRect().height : 0;
  if (!sourceHeader || !sourceItems || !sourceTitle || !sourceTable || !sourceFooter || !sourceRows.length) return;

  const measureHost = document.createElement('div');
  measureHost.style.cssText = 'position:absolute;left:-20000px;top:0;width:198mm;visibility:hidden;';
  document.body.appendChild(measureHost);
  document.body.classList.add('danfe-pagination-measuring');

  try {
    const pageHeight = heightOf(template);
    const stripeHeight = heightOf(sourceStripe);
    const headerHeight = heightOf(sourceHeader);
    const consumerHeight = heightOf(sourceConsumer);
    const titleHeight = heightOf(sourceTitle);
    const tableHead = sourceTable.tHead;
    const tableHeadHeight = heightOf(tableHead);
    const rowHeights = sourceRows.map(heightOf);
    const totalRowsHeight = rowHeights.reduce((total, height) => total + height, 0);
    const tableChromeHeight = Math.max(0, heightOf(sourceTable) - tableHeadHeight - totalRowsHeight);
    const footerHeight = heightOf(sourceFooter);
    const infoHeight = heightOf(sourceInfo);
    const safety = 2;
    const headerWithConsumer = stripeHeight + headerHeight + consumerHeight;
    const headerContinuation = stripeHeight + headerHeight;
    const firstCapacity = pageHeight - headerWithConsumer - titleHeight - tableHeadHeight - tableChromeHeight - safety;
    const continuationCapacity = pageHeight - headerContinuation - titleHeight - tableHeadHeight - tableChromeHeight - safety;
    const totalRows = totalRowsHeight + tableChromeHeight;

    let productGroups;
    if (totalRows + footerHeight + infoHeight <= firstCapacity) {
      productGroups = [sourceRows];
    } else if (totalRows + footerHeight <= firstCapacity) {
      productGroups = [sourceRows];
    } else {
      const lastCapacity = continuationCapacity - footerHeight;
      let suffixStart = sourceRows.length;
      let suffixHeight = tableChromeHeight;
      while (suffixStart > 0 && suffixHeight + rowHeights[suffixStart - 1] <= lastCapacity) {
        suffixStart -= 1;
        suffixHeight += rowHeights[suffixStart];
      }
      if (suffixStart === 0) suffixStart = 1;

      productGroups = [];
      let rowIndex = 0;
      while (rowIndex < suffixStart) {
        const capacity = rowIndex === 0 ? firstCapacity : continuationCapacity;
        const group = [];
        let groupHeight = tableChromeHeight;
        while (rowIndex < suffixStart && groupHeight + rowHeights[rowIndex] <= capacity) {
          group.push(sourceRows[rowIndex]);
          groupHeight += rowHeights[rowIndex];
          rowIndex += 1;
        }
        if (!group.length) {
          group.push(sourceRows[rowIndex]);
          rowIndex += 1;
        }
        productGroups.push(group);
      }
      productGroups.push(sourceRows.slice(suffixStart));
    }

    const infoColumns = sourceInfo ? Array.from(sourceInfo.querySelectorAll('.additional-info-content')) : [];
    let remainingInfo = infoColumns.map((element) => element.textContent || '');
    const splitText = (text, sourceElement, maxHeight) => {
      if (!text) return { part: '', rest: '', consumed: 0 };
      const characters = Array.from(text);
      const probe = document.createElement(sourceElement.tagName.toLowerCase());
      probe.className = sourceElement.className;
      probe.style.cssText = 'position:absolute;left:-20000px;top:0;width:' + sourceElement.getBoundingClientRect().width + 'px;';
      measureHost.appendChild(probe);
      let low = 1;
      let high = characters.length;
      let best = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        probe.textContent = characters.slice(0, middle).join('');
        if (heightOf(probe) <= maxHeight) {
          best = middle;
          low = middle + 1;
        } else {
          high = middle - 1;
        }
      }
      probe.remove();
      if (best === 0) return { part: '', rest: text, consumed: 0 };
      if (best < characters.length) {
        const earliestBoundary = Math.floor(best * 0.75);
        for (let index = best - 1; index >= earliestBoundary; index -= 1) {
          if (/\s/.test(characters[index])) {
            best = index + 1;
            break;
          }
        }
      }
      return {
        part: characters.slice(0, best).join(''),
        rest: characters.slice(best).join(''),
        consumed: best,
      };
    };
    const takeInfoPiece = (remaining, maxSectionHeight) => {
      if (!sourceInfo || maxSectionHeight <= 0) return null;
      const emptySection = sourceInfo.cloneNode(true);
      const emptyContents = Array.from(emptySection.querySelectorAll('.additional-info-content'));
      emptyContents.forEach((element) => { element.textContent = ''; });
      measureHost.appendChild(emptySection);
      const emptyHeight = heightOf(emptySection);
      const baseTextHeight = Math.max(...emptyContents.map(heightOf));
      const textHeightLimit = Math.max(0, maxSectionHeight - emptyHeight + baseTextHeight);
      const measuredContents = Array.from(emptySection.querySelectorAll('.additional-info-content'));
      const pieces = remaining.map((text, index) => splitText(text, measuredContents[index], textHeightLimit));
      emptySection.remove();
      if (!pieces.some((piece) => piece.consumed > 0)) return null;

      const section = sourceInfo.cloneNode(true);
      const content = Array.from(section.querySelectorAll('.additional-info-content'));
      content.forEach((element, index) => { element.textContent = pieces[index].part; });
      measureHost.appendChild(section);
      const sectionHeight = heightOf(section);
      section.remove();
      return {
        section,
        pieces,
        remaining: pieces.map((piece) => piece.rest),
        height: sectionHeight,
      };
    };

    const lastGroup = productGroups[productGroups.length - 1];
    const lastGroupHeight = lastGroup.reduce((total, row) => total + heightOf(row), 0) + tableChromeHeight;
    const lastHasConsumer = productGroups.length === 1;
    const lastHeaderHeight = lastHasConsumer ? headerWithConsumer : headerContinuation;
    const remainingHeightForInfo = pageHeight - lastHeaderHeight - titleHeight - tableHeadHeight - lastGroupHeight - footerHeight - safety;
    const finalPageInfo = takeInfoPiece(remainingInfo, remainingHeightForInfo);
    if (finalPageInfo) remainingInfo = finalPageInfo.remaining;

    const infoPages = [];
    const infoPageCapacity = pageHeight - headerContinuation - safety;
    while (remainingInfo.some(Boolean)) {
      const piece = takeInfoPiece(remainingInfo, infoPageCapacity);
      if (!piece) break;
      infoPages.push(piece);
      remainingInfo = piece.remaining;
    }

    const totalPageCount = productGroups.length + infoPages.length;
    const buildTable = (rows) => {
      const table = sourceTable.cloneNode(false);
      Array.from(sourceTable.children).forEach((child) => {
        if (child.tagName.toLowerCase() !== 'tbody') {
          table.appendChild(child.cloneNode(true));
          return;
        }
        const body = document.createElement('tbody');
        rows.forEach((row) => body.appendChild(row.cloneNode(true)));
        const filler = document.createElement('tr');
        filler.className = 'table-fill-row';
        filler.setAttribute('aria-hidden', 'true');
        const columnCount = sourceTable.tHead.querySelectorAll('th').length;
        for (let index = 0; index < columnCount; index += 1) filler.appendChild(document.createElement('td'));
        body.appendChild(filler);
        table.appendChild(body);
      });
      return table;
    };
    const buildPage = (rows, index, isFirst, isFinal, infoPiece) => {
      const page = document.createElement('section');
      page.className = 'danfe-page';
      page.dataset.pageNumber = String(index);
      if (sourceStripe) page.appendChild(sourceStripe.cloneNode(true));
      const header = sourceHeader.cloneNode(true);
      const counter = header.querySelector('.doc-page-counter');
      if (counter) counter.textContent = 'Folha ' + index + '/' + totalPageCount;
      page.appendChild(header);
      if (isFirst && sourceConsumer) page.appendChild(sourceConsumer.cloneNode(true));
      if (rows) {
        const items = document.createElement('section');
        items.className = 'page-items';
        items.appendChild(sourceTitle.cloneNode(true));
        items.appendChild(buildTable(rows));
        page.appendChild(items);
      }
      if (isFinal) page.appendChild(sourceFooter.cloneNode(true));
      if (infoPiece && sourceInfo) {
        const section = sourceInfo.cloneNode(true);
        Array.from(section.querySelectorAll('.additional-info-content')).forEach((element, infoIndex) => {
          element.textContent = infoPiece.pieces[infoIndex].part;
        });
        page.appendChild(section);
      }
      return page;
    };

    const pages = [];
    productGroups.forEach((group, index) => {
      const isFinal = index === productGroups.length - 1;
      pages.push(buildPage(group, index + 1, index === 0, isFinal, isFinal ? finalPageInfo : null));
    });
    infoPages.forEach((piece, index) => {
      pages.push(buildPage(null, productGroups.length + index + 1, false, false, piece));
    });
    root.replaceChildren(...pages);

    pages.slice(0, productGroups.length).forEach((page) => {
      const fillerRow = page.querySelector('.table-fill-row');
      if (!fillerRow) return;
      fillerRow.querySelectorAll('td').forEach((cell) => { cell.style.height = '0px'; });
      const pageTop = page.getBoundingClientRect().top;
      const contentBottom = Math.max(...Array.from(page.children).map((element) => element.getBoundingClientRect().bottom));
      const remaining = Math.max(0, pageHeight - (contentBottom - pageTop) - safety);
      if (remaining <= safety) {
        fillerRow.remove();
        return;
      }

      const targetLineHeight = 4 * 96 / 25.4;
      const lineCount = Math.max(1, Math.ceil(remaining / targetLineHeight));
      const lineHeight = remaining / lineCount;
      const fillerRows = Array.from({ length: lineCount }, () => {
        const row = fillerRow.cloneNode(true);
        row.querySelectorAll('td').forEach((cell) => { cell.style.height = lineHeight + 'px'; });
        return row;
      });
      fillerRow.replaceWith(...fillerRows);
    });
  } catch (error) {
    console.error('[DANFE NFC-e A4] Falha ao paginar as folhas.', error);
  } finally {
    document.body.classList.remove('danfe-pagination-measuring');
    measureHost.remove();
  }
})();
`;
