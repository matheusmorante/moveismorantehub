import React from 'react';

interface ProfilePersonalInfoSectionProps {
  fullName: string;
  phone: string;
  position: string;
  email: string;
  address: string;
  city: string;
  stateValue: string;
  loading: boolean;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPositionChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateValueChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export const ProfilePersonalInfoSection: React.FC<ProfilePersonalInfoSectionProps> = ({
  fullName,
  phone,
  position,
  email,
  address,
  city,
  stateValue,
  loading,
  onFullNameChange,
  onPhoneChange,
  onPositionChange,
  onAddressChange,
  onCityChange,
  onStateValueChange,
  onSubmit,
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
    <div className="flex items-center gap-4 mb-8">
      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
        <i className="bi bi-person-badge-fill text-blue-600 text-xl"></i>
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
          Informações Pessoais
        </h3>
        <p className="text-xs text-slate-400 font-bold italic">
          Mantenha seus dados sempre atualizados.
        </p>
      </div>
    </div>

    <form noValidate onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
            Nome Completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFullNameChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Seu nome"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
            WhatsApp / Celular
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPhoneChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="(00) 00000-0000"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              Cargo Principal
            </label>
            <select
              value={position}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPositionChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            >
              <option value="">Selecione o cargo...</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Gerente">Gerente</option>
              <option value="Entregador">Entregador</option>
              {position && !['Vendedor', 'Gerente', 'Entregador'].includes(position) && (
                <option value={position}>{position}</option>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              E-mail
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                readOnly
                className="grow bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-400 dark:text-slate-500 font-bold outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
            Endereço Residencial
          </label>
          <input
            type="text"
            value={address}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAddressChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Rua, Número, Bairro"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              Cidade
            </label>
            <input
              type="text"
              value={city}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onCityChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Sua Cidade"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">
              Estado
            </label>
            <input
              type="text"
              value={stateValue}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onStateValueChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-4 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Ex: São Paulo"
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          'Salvar Alterações'
        )}
      </button>
    </form>
  </div>
);
