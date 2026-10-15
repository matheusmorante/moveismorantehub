// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import ReceiptFiscalDocumentsSection from '../../pages/App/Stock/Receipts/components/ReceiptFiscalDocumentsSection';
import { LabelGridSheetPreview } from '../../pages/App/Stock/LabelPrinting/components/LabelGridSheetPreview';
import LabelQueue from '../../pages/App/Stock/LabelPrinting/components/LabelQueue';
import AIPromptsSection from '../../pages/App/Settings/components/ai/AIPromptsSection';
import { imageFilesFormSchema, documentFilesFormSchema } from '../../../../shared-utils/fileFormSchemas';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), publicUrl: vi.fn(), error: vi.fn(), compress: vi.fn() }));
vi.mock('@/pages/utils/imageUtils', () => ({ compressImage: mocks.compress }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { storage: { from: () => ({ upload: mocks.upload, getPublicUrl: mocks.publicUrl }) } } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.error, success: vi.fn() } }));
vi.mock('../../pages/App/Stock/LabelPrinting/components/ProductSearchInput', () => ({ default: () => null }));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ error: null });
  mocks.publicUrl.mockReturnValue({ data: { publicUrl: 'https://example.com/receipt.pdf' } });
  mocks.compress.mockResolvedValue('data:image/png;base64,photo');
});
const image = () => new File(['photo'], 'photo.png', { type: 'image/png' });
const invalid = () => new File(['text'], 'text.txt', { type: 'text/plain' });
const select = (view: ReturnType<typeof render>, file: File) => fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [file] } });

describe('file form owners', () => {
  it('validates the assistant avatar before compression or updating settings', async () => {
    const change = vi.fn();
    const settings = { aiPrompts: { aiAvatar: '', aiName: 'Assistente', productDescription: '', generalChat: '', taskDetection: '' } } as never;
    const view = render(<AIPromptsSection settings={settings} onChange={change} />);
    select(view, invalid());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione um arquivo de imagem.'));
    expect(mocks.compress).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
    const photo = image();
    select(view, photo);
    await waitFor(() => expect(change).toHaveBeenCalledWith('aiPrompts.aiAvatar', 'data:image/png;base64,photo'));
    expect(mocks.compress).toHaveBeenCalledWith(photo, expect.any(Object));
  });

  it('requires real File objects and preserves supported files', () => {
    expect(imageFilesFormSchema.safeParse({ files: [{ type: 'image/png' }] }).success).toBe(false);
    const file = image();
    expect(imageFilesFormSchema.parse({ files: [file] }).files[0]).toBe(file);
    expect(documentFilesFormSchema.safeParse({ files: [invalid()] }).success).toBe(false);
  });

  it('blocks receipt documents and excessive counts before Storage, then keeps previous attachments', async () => {
    const change = vi.fn();
    const view = render(<ReceiptFiscalDocumentsSection attachments={['previous']} onAttachmentsChange={change} />);
    select(view, invalid());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Selecione arquivos PDF ou imagens.'));
    expect(mocks.upload).not.toHaveBeenCalled();
    view.rerender(<ReceiptFiscalDocumentsSection attachments={['1', '2', '3', '4']} onAttachmentsChange={change} />);
    fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [image(), image()] } });
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('5')));
    expect(mocks.upload).not.toHaveBeenCalled();
    view.rerender(<ReceiptFiscalDocumentsSection attachments={['previous']} onAttachmentsChange={change} />);
    const pdf = new File(['pdf'], 'receipt.pdf', { type: 'application/pdf' });
    select(view, pdf);
    await waitFor(() => expect(change).toHaveBeenCalledWith(['previous', 'https://example.com/receipt.pdf']));
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringContaining('receipt.pdf'), pdf);
  });

  it('blocks invalid sheet previews before FileReader and accepts images', async () => {
    const change = vi.fn();
    const read = vi.spyOn(FileReader.prototype, 'readAsDataURL');
    const view = render(<LabelGridSheetPreview layout={{ paperWidth: 210, paperHeight: 297, columns: 1, rows: 1, margins: { top: 0, bottom: 0, left: 0, right: 0 }, gaps: { horizontal: 0, vertical: 0 }, layoutType: 'rect', backgroundColor: '#fff', imageScale: 1, previewImage: null, customPreviewImage: null }} onCustomPreviewImageChange={change} />);
    select(view, invalid());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(read).not.toHaveBeenCalled();
    select(view, image());
    await waitFor(() => expect(change).toHaveBeenCalledWith(expect.stringContaining('data:image/png;base64,')));
  });

  it('blocks invalid queue images and fills a blank label using parsed image input', async () => {
    const update = vi.fn();
    const item = { id: 'label-1', isBlank: true, quantity: 1 };
    const view = render(<LabelQueue labelItems={[item]} setLabelItems={update} printingMode="simple" config={{}} />);
    select(view, invalid());
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(update).not.toHaveBeenCalled();
    select(view, image());
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]([item])).toEqual([expect.objectContaining({ id: 'label-1', isBlank: false, printingMode: 'simple', image: expect.stringContaining('data:image/png;base64,') })]);
  });
});
