// @vitest-environment happy-dom
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewSection } from './PreviewSection';
import { createInitialLabelConfig } from '../services/labelModelMapper';

vi.mock('../components/LabelGrid', () => ({ default: () => <div /> }));
afterEach(cleanup);

const renderPreview = (selectedCategory: 'identificacao' | 'precos' | 'logos' = 'identificacao') => {
  const printAdvanced = vi.fn();
  const printNormally = vi.fn();
  render(<PreviewSection
    config={createInitialLabelConfig()}
    printingMode="advanced"
    artVersion={0}
    savedArtConfigs={{}}
    selectedImage={null}
    cellImages={{}}
    handleCellClick={vi.fn()}
    labelItems={[]}
    logoItems={[]}
    currentPage={0}
    setCurrentPage={vi.fn()}
    handleDownloadImage={vi.fn()}
    printLabels={printAdvanced}
    printLabelsNormally={printNormally}
    isPrinting={false}
    isDownloading={false}
    selectedCategory={selectedCategory}
    previewContainerRef={createRef<HTMLDivElement>()}
    previewScaleRef={createRef<HTMLDivElement>()}
    gridRef={createRef<HTMLDivElement>()}
    previewZoom={1}
    setPreviewZoom={vi.fn()}
    isPreviewFullscreen={false}
  />);
  fireEvent.click(screen.getByRole('button', { name: 'Ações do preview' }));
  return { printAdvanced, printNormally };
};

describe('ações de impressão das etiquetas', () => {
  it('separa a impressão avançada beta da janela normal do dispositivo', () => {
    const { printAdvanced, printNormally } = renderPreview();
    fireEvent.click(screen.getByRole('button', { name: 'Impressão avançada beta' }));
    expect(printAdvanced).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Ações do preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(printNormally).toHaveBeenCalledOnce();
  });

  it('mantém somente a impressão normal para a categoria de logos', () => {
    const { printAdvanced, printNormally } = renderPreview('logos');
    expect(screen.queryByRole('button', { name: 'Impressão avançada beta' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
    expect(printNormally).toHaveBeenCalledOnce();
    expect(printAdvanced).not.toHaveBeenCalled();
  });
});
