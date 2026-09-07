export type SquareSelection = { x: number; y: number; size: number };
export type CropCorner = 'nw' | 'ne' | 'sw' | 'se';

export function createCenteredSquareSelection(width: number, height: number): SquareSelection | null {
    if (width === 0 || height === 0) return null;

    const size = Math.min(width, height);
    return {
        x: (width - size) / 2,
        y: (height - size) / 2,
        size,
    };
}

export function resizeSquareSelection(
    pointerX: number,
    initialPointerX: number,
    corner: CropCorner,
    selection: SquareSelection,
    containerWidth: number,
    containerHeight: number,
): SquareSelection {
    const east = corner.endsWith('e');
    const south = corner.startsWith('s');
    const anchorX = east ? selection.x : selection.x + selection.size;
    const anchorY = south ? selection.y : selection.y + selection.size;
    const requested = selection.size + (pointerX - initialPointerX) * (east ? 1 : -1);
    const maxX = east ? containerWidth - anchorX : anchorX;
    const maxY = south ? containerHeight - anchorY : anchorY;
    const size = Math.max(60, Math.min(requested, maxX, maxY));

    return { x: east ? anchorX : anchorX - size, y: south ? anchorY : anchorY - size, size };
}

export function moveSquareSelection(
    pointerX: number,
    pointerY: number,
    initialPointerX: number,
    initialPointerY: number,
    selection: SquareSelection,
    containerWidth: number,
    containerHeight: number,
): SquareSelection {
    const x = Math.min(Math.max(0, selection.x + pointerX - initialPointerX), containerWidth - selection.size);
    const y = Math.min(Math.max(0, selection.y + pointerY - initialPointerY), containerHeight - selection.size);

    return { ...selection, x, y };
}
