type OriginalDocumentItem = { id: string; item_number: number };
type DraftLine = { id: string; original_document_item_id: string; quantity: number };
type ReturnAllocation = { id: string; original_item_number: number; quantity: number };
type DraftAllocationLink = { draft_line_id: string; allocation_id: string };

export function validateReturnDraftAllocationLinks(params: {
  allocationsByNumber: ReadonlyMap<number, readonly ReturnAllocation[]>;
  sourceLineByNumber: ReadonlyMap<number, OriginalDocumentItem>;
  draftLineByOriginalId: ReadonlyMap<string, DraftLine>;
  lines: readonly DraftLine[];
  allocationLinks: readonly DraftAllocationLink[] | null;
}): string | null {
  const {
    allocationsByNumber,
    sourceLineByNumber,
    draftLineByOriginalId,
    lines,
    allocationLinks,
  } = params;

  for (const [originalItemNumber, allocations] of allocationsByNumber) {
    const originalLine = sourceLineByNumber.get(originalItemNumber);
    const draftLine = originalLine && draftLineByOriginalId.get(originalLine.id);
    const linksForLine = draftLine
      ? (allocationLinks || []).filter((link) => link.draft_line_id === draftLine.id)
      : [];
    const expectedAllocationIds = allocations.map((allocation) => allocation.id).sort();
    const linkedAllocationIds = linksForLine.map((link) => link.allocation_id).sort();
    const expectedQuantity = allocations.reduce(
      (sum, allocation) => sum + allocation.quantity,
      0
    );

    if (
      !draftLine ||
      Math.abs(Number(draftLine.quantity) - expectedQuantity) > 0.00005 ||
      JSON.stringify(expectedAllocationIds) !== JSON.stringify(linkedAllocationIds)
    ) {
      return 'Os itens e quantidades do rascunho não correspondem às alocações persistidas da devolução.';
    }
  }

  if (allocationsByNumber.size !== lines.length) {
    return 'O rascunho contém item sem alocação fiscal correspondente à devolução.';
  }

  return null;
}
