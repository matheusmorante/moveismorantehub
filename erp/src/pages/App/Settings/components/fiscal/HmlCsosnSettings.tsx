import { useEffect, useState } from 'react';
import { CSOSN_OPTIONS } from '../../../../utils/nfe/fiscalConstants';
import {
  getHmlCsosnConfiguration,
  saveHmlCsosnConfiguration,
} from '../../../../utils/nfe/csosnConfigurationService';

export function HmlCsosnSettings() {
  const [csosn, setCsosn] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getHmlCsosnConfiguration()
      .then((config) => {
        if (active) {
          setCsosn(config.csosn);
          setSaved(config.csosn);
        }
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const config = await saveHmlCsosnConfiguration(csosn);
      setCsosn(config.csosn);
      setSaved(config.csosn);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="p-8 border-b border-slate-100 dark:border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1 max-w-lg">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            CSOSN padrão da NF-e — Homologação
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Aplicado aos itens sem escolha explícita ou exceção fiscal. Somente NF-e 55, Simples
            Nacional (CRT 1), em homologação.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            A configuração de produção permanece separada. CSOSN 103 corresponde à isenção por faixa
            de receita bruta.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-96">
          <select
            aria-label="CSOSN padrão da NF-e em homologação"
            value={csosn}
            disabled={busy}
            onChange={(event) => setCsosn(event.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border rounded-2xl px-5 py-3 text-sm dark:text-slate-200"
          >
            <option value="">{busy ? 'Carregando configuração…' : 'Selecione o CSOSN'}</option>
            {CSOSN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={save}
            disabled={busy || !csosn}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {busy ? 'Aguarde…' : 'Salvar padrão de homologação'}
          </button>
          {!busy && csosn && saved === csosn && !error && (
            <p role="status" className="text-xs text-slate-500">
              Padrão atual: {saved}
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
