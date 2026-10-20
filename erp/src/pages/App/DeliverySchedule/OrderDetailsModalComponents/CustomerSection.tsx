import React from 'react';
import { toTitleCase } from '../../../utils/formatters';

export type AdditionalContact = { name?: string; phone?: string };

export interface CustomerSectionProps {
  fullName?: string;
  phone?: string;
  noPhone?: boolean;
  email?: string;
  cpfCnpj?: string;
  observations?: string;
  additionalContacts?: AdditionalContact[];
}

export const CustomerSection: React.FC<CustomerSectionProps> = ({
  fullName,
  phone,
  noPhone,
  email,
  cpfCnpj,
  observations,
  additionalContacts = [],
}) => (
  <section>
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
      <i className="bi bi-person-badge-fill" /> Cliente
    </h3>

    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-base font-black text-slate-800 dark:text-slate-100 mb-1">
          {toTitleCase(fullName || 'Consumidor Não Identificado')}
        </p>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <i className="bi bi-telephone-fill text-blue-400 text-[10px]" />
          {noPhone ? 'Sem Telefone' : phone || 'Telefone não informado'}
        </p>
        {(email || cpfCnpj) && (
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {email && (
              <span className="flex items-center gap-1.5">
                <i className="bi bi-envelope-fill text-blue-400 text-[10px]" />
                <span className="truncate">{email}</span>
              </span>
            )}
            {cpfCnpj && (
              <span className="flex items-center gap-1.5">
                <i className="bi bi-person-vcard-fill text-blue-400 text-[10px]" />
                {cpfCnpj}
              </span>
            )}
          </div>
        )}
        {additionalContacts.filter((c) => c.name || c.phone).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {additionalContacts
              .filter((c) => c.name || c.phone)
              .map((contact, index) => (
                <div key={index} className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">
                    {contact.name || 'Contato adicional'}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {contact.phone || 'Telefone não informado'}
                  </span>
                </div>
              ))}
          </div>
        )}
        {observations && (
          <p className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium italic leading-relaxed text-slate-400 dark:text-slate-500">
            {observations}
          </p>
        )}
      </div>
      {phone && !noPhone && (
        <button
          type="button"
          onClick={() => {
            const cleanPhone = phone.replace(/\D/g, '');
            const finalPhone =
              cleanPhone.length >= 10 && cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
            window.open(`https://wa.me/${finalPhone}`, '_blank');
          }}
          title="Chamar no WhatsApp"
          className="shrink-0 w-10 h-10 flex items-center justify-center bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl transition-all shadow-sm shadow-[#25D366]/30 active:scale-95"
        >
          <i className="bi bi-whatsapp text-lg" />
        </button>
      )}
    </div>
  </section>
);
