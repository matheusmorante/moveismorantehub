interface NcmCorrelationRecordsProps {
  correlations: any[];
  selectedCode: string;
  canManage: boolean;
  detailStatus: string;
  hasProducts: boolean;
  onSelectSuccessor: (code: string) => void;
}

export function NcmCorrelationRecords({
  correlations,
  selectedCode,
  canManage,
  detailStatus,
  hasProducts,
  onSelectSuccessor,
}: NcmCorrelationRecordsProps) {
  return correlations.length === 0 ? (
    <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">
      Nenhuma correlação registrada. Consulte o{' '}
      <a
        className="font-bold text-blue-600 underline"
        href="https://rastreador-ncm.dth.mdic.gov.br/"
        target="_blank"
        rel="noreferrer"
      >
        Rastreador NCM do MDIC
      </a>{' '}
      para apoiar a revisão.
    </p>
  ) : (
    <div className="space-y-2">
      {correlations.map((item) => {
        const outgoing = correlations.filter(
          (relation) => relation.source_code === selectedCode
        );
        const unambiguous =
          outgoing.length > 0 &&
          new Set(outgoing.map((relation) => relation.destination_code)).size ===
            1 &&
          outgoing.every(
            (relation) =>
              relation.relation_type === 'one_to_one' ||
              relation.relation_type === 'many_to_one'
          );
        return (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
          >
            <p className="font-mono font-bold">
              {item.source_code} → {item.destination_code}
            </p>
            <p className="mt-1 text-slate-500">
              {item.relation_type.replaceAll('_', ' ')} · {item.source_name}
              {item.version_label ? ` · ${item.version_label}` : ''}
            </p>
            {item.source_reference?.startsWith('https://') && (
              <a
                href={item.source_reference}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block break-all text-[10px] text-blue-600 underline"
              >
                Fonte da correlação
              </a>
            )}
            {canManage &&
              detailStatus !== 'Vigente' &&
              hasProducts &&
              unambiguous &&
              item.source_code === selectedCode && (
                <button
                  type="button"
                  onClick={() =>
                    void onSelectSuccessor(item.destination_code)
                  }
                  className="mt-2 font-bold text-blue-600 underline underline-offset-2"
                >
                  Selecionar sucessor e produtos desta página
                </button>
              )}
          </div>
        );
      })}
    </div>
  );
}
