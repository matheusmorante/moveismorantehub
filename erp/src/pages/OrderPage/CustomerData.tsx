import CustomerData from '../types/customerData.type';
import { toTitleCase } from '../utils/shared/formatters';

interface Props {
  customerData: CustomerData;
  isPickup?: boolean;
  noAddress?: boolean;
  isOperationInfo?: boolean;
  hideAddress?: boolean;
}

const CustomerDataInputs = ({ customerData, isPickup, noAddress, isOperationInfo, hideAddress }: Props) => {
  const addr = customerData.fullAddress || {};
  const hasAnyAddress = !!(
    addr.street || addr.number || addr.complement || addr.neighborhood || addr.city || addr.observation
  );
  const addressFields = [
    {
      label: 'Logradouro',
      value: [toTitleCase(addr.street), addr.number].filter(Boolean).join(', '),
    },
    { label: 'Complemento', value: toTitleCase(addr.complement) },
    { label: 'Bairro', value: toTitleCase(addr.neighborhood) },
    {
      label: 'Cidade',
      value: [toTitleCase(addr.city), addr.state?.toUpperCase()].filter(Boolean).join(' - '),
    },
    { label: 'Observações', value: addr.observation?.trim() || '' },
  ].filter((field) => field.value.trim());

  // If it's a pickup, explicitly marked as noAddress, or COMPLETELY missing address fields, hide the address section.
  const showAddress = !hideAddress && !isPickup && !noAddress && hasAnyAddress;

  return (
    <div className="flex flex-col my-2 gap-2 font-sans border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm bg-white print-exact-bg">
      {!isOperationInfo && (
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Informações do Cliente / Destinatário
          </span>
        </div>
      )}

      <div className={`px-6 pb-4 ${isOperationInfo ? 'pt-4' : 'pt-2'}`}>
        {isOperationInfo && (
          <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">
            Cliente
          </h3>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <div className="flex flex-col flex-grow min-w-[200px]">
            <span className={`${isOperationInfo ? 'text-[9px]' : 'text-[10px]'} font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none`}>
              Nome Completo
            </span>
            <span className={`${isOperationInfo ? 'text-sm' : 'text-lg'} font-bold text-slate-900 leading-tight`}>
              {toTitleCase(customerData.fullName)}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {customerData.phone && !customerData.noPhone && (
              <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[150px]">
                <span className={`${isOperationInfo ? 'text-[9px]' : 'text-[10px]'} font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none`}>
                  Celular
                </span>
                <span className={`${isOperationInfo ? 'text-sm' : 'text-lg'} font-bold text-slate-900`}>
                  {customerData.phone}
                </span>
              </div>
            )}

            {(customerData.additionalContacts || []).map((contact, idx) => (
              <div key={idx} className="flex flex-col">
                <span className={`${isOperationInfo ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase text-slate-400 tracking-wider mb-0.5`}>
                  {toTitleCase(contact.name || 'Contato Extra')}
                </span>
                <span className={`${isOperationInfo ? 'text-sm' : 'text-base'} font-medium text-slate-800`}>
                  {contact.phone}
                </span>
              </div>
            ))}
          </div>
        </div>

        {showAddress && (
          isOperationInfo ? (
            <div className="pt-4 border-t border-slate-50">
              <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                Endereço para a entrega
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-3">
                {addressFields.map(({ label, value }) => (
                  <div key={label} className="flex min-w-0 flex-col">
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-0.5">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-slate-800 break-words">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                  Endereço
                </span>
                <span className="text-base font-medium text-slate-800">
                  {toTitleCase(addr.street)}
                  {addr.number ? `, ${addr.number}` : ''}
                  {addr.complement && (
                    <span className="text-slate-400 ml-2 font-normal">
                      ({toTitleCase(addr.complement)})
                    </span>
                  )}
                </span>
              </div>

              {addr.neighborhood && (
                <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                    Bairro
                  </span>
                  <span className="text-base font-medium text-slate-800">
                    {toTitleCase(addr.neighborhood)}
                  </span>
                </div>
              )}

              {addr.city && (
                <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[120px]">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                    Cidade
                  </span>
                  <span className="text-base font-medium text-slate-800">
                    {toTitleCase(addr.city)}
                    {addr.state ? ` - ${addr.state}` : ''}
                  </span>
                </div>
              )}
            </div>
          )
        )}

        {customerData.observations && (
          <div className="mt-1 pt-1 border-t border-slate-100 italic">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">
              OBSERVAÇÕES SOBRE O CLIENTE:
            </span>
            <p className="text-sm font-bold text-slate-800 uppercase leading-snug">
              {customerData.observations}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
export default CustomerDataInputs;
