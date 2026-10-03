async (page) => page.evaluate(() => {
  const dialogs = [...document.querySelectorAll('[role=dialog]')];
  const el = dialogs.find((d) => /EMITIR NF-E EM HOMOLOGAÇÃO/i.test(d.innerText || ''));
  if (!el) return { modal: false };
  const fiberKey = Object.keys(el).find((key) => key.startsWith('__reactFiber$'));
  let fiber = fiberKey ? el[fiberKey] : null;
  const components = [];
  for (let i = 0; fiber && i < 80; i += 1, fiber = fiber.return) {
    const type = fiber.elementType || fiber.type;
    const name = typeof type === 'function' ? type.displayName || type.name : typeof type === 'string' ? type : '';
    const props = fiber.memoizedProps;
    if (/NfeEmissionModal|PostOrderActionsModal/i.test(name) && props) {
      const order = props.order;
      components.push({
        name,
        isOpen: props.isOpen,
        id: order?.id || null,
        version: order?.version ?? null,
        items: (order?.items || []).map((item) => ({
          orderItemId: item.orderItemId || null,
          productId: item.productId || null,
          variationId: item.variationId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  }
  return { modal: true, components };
})
