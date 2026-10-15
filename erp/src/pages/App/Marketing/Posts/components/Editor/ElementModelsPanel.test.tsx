// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementModelsPanel } from './ElementModelsPanel';
import type { Layer } from '../../types';
const mocks = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@/pages/utils/storageService', () => ({ uploadFile: mocks.upload }));
vi.mock('../../services/elementModels', () => ({ loadElementModels: async () => [], saveElementModel: vi.fn(), applyElementModel: vi.fn() }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue('https://example.com/element.png'); });
function setup() {
  const change = vi.fn(), message = vi.fn();
  const layer = { id: 'layer', name: 'Logo', type: 'ASSET', x: 0, y: 0, width: 100, height: 100, rotation: 0, zIndex: 0, opacity: 1, locked: false, visible: true, role: 'brand' } as Layer;
  const view = render(<ElementModelsPanel layers={[layer]} selected="layer" onChange={change} onMessage={message} />);
  const select = (type: string) => fireEvent.change(view.container.querySelector('input[type=file]')!, { target: { files: [new File(['image'], 'image.png', { type })] } });
  return { change, message, select };
}
describe('element image form owner', () => {
  it('enforces the existing supported image formats through the resolver before uploading', async () => {
    const { select, message, change } = setup();
    select('image/gif');
    await waitFor(() => expect(message).toHaveBeenCalledWith('Use PNG, WebP ou JPEG.'));
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
  });
  it('prevents concurrent uploads and updates the original layer using the parsed file', async () => {
    let finish!: (url: string) => void;
    mocks.upload.mockImplementationOnce(() => new Promise<string>((resolve) => { finish = resolve; }));
    const { select, change } = setup();
    select('image/png');
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledTimes(1));
    select('image/png');
    await act(async () => { await Promise.resolve(); });
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    await act(async () => { finish('https://example.com/element.png'); });
    await waitFor(() => expect(change).toHaveBeenCalledWith(expect.objectContaining({ id: 'layer', type: 'ASSET', assetUrl: 'https://example.com/element.png', visible: true })));
  });
});
