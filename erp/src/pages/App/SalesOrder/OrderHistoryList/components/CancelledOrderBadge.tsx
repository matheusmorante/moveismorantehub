type Props = { tilted?: boolean; large?: boolean; withOverlay?: boolean; text?: string };

const CancelledOrderBadge = ({
  withOverlay = true,
}: Props) => (
  <>
    {withOverlay && (
      <div
        aria-hidden="true"
        data-testid="cancelled-order-overlay"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-slate-950/35"
      />
    )}
  </>
);

export default CancelledOrderBadge;
