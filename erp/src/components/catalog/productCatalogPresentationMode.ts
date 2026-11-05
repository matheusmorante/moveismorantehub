export type CatalogPresentation = 'fullscreen' | 'modal' | 'drawer';

export const getProductCatalogPresentation = (
  viewportWidth: number,
  contentWidth: number,
): CatalogPresentation => {
  if (viewportWidth < 768) return 'fullscreen';
  if (viewportWidth >= 1440) {
    const drawerWidth = viewportWidth >= 1920
      ? Math.min(900, Math.max(800, viewportWidth * 0.44))
      : Math.min(760, Math.max(680, viewportWidth * 0.46));
    return contentWidth >= drawerWidth + 360 ? 'drawer' : 'modal';
  }
  return 'modal';
};
