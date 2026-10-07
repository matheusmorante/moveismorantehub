import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  createProductMaterial,
  deleteProductMaterialIfUnused,
  fetchProductMaterials,
  getProductMetadataErrorCode,
  type ProductCatalogMetadataOption,
} from '../../../services/productCatalogMetadataService';

export type ProductMaterial = ProductCatalogMetadataOption;

export interface ProductMaterialManagementModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onMaterialChange?: () => void;
}

/**
 * Modal para gerenciar a lista global de materiais de produtos (ex: MDP, MDF, Madeira Maciça).
 */
export const ProductMaterialManagementModal: React.FC<ProductMaterialManagementModalProps> = ({
  isOpen,
  onClose,
  onMaterialChange,
}) => {
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchMaterials = useCallback(async () => {
    setFetching(true);
    try {
      setMaterials(await fetchProductMaterials());
    } catch (err: unknown) {
      console.error('Erro ao listar materiais:', err);
      if (getProductMetadataErrorCode(err) === '42P01') {
        toast.info('Aguarde a execução do SQL de migração para carregar os materiais.');
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchMaterials();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, fetchMaterials, onClose]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = newName.trim().toUpperCase();
    if (!value) return;

    setLoading(true);
    try {
      await createProductMaterial(value);

      setNewName('');
      toast.success('Material adicionado!');
      await fetchMaterials();
      if (onMaterialChange) onMaterialChange();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao adicionar material.';
      toast.error(message);
      console.error('Falha ao adicionar material:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (material: ProductMaterial) => {
    if (!window.confirm(`Tem certeza que deseja remover o material "${material.name}"?`)) return;

    try {
      // Verificar se existem produtos usando este material
      const result = await deleteProductMaterialIfUnused(material);

      if (!result.deleted) {
        toast.error(
          `Não é possível remover: Existem ${result.linkedProductCount} produtos vinculados a este material.`
        );
        return;
      }
      toast.success('Material removido!');
      await fetchMaterials();
      if (onMaterialChange) onMaterialChange();
    } catch (error: unknown) {
      toast.error('Erro ao remover material.');
      console.error('Falha ao remover material:', error);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-material-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
          <div>
            <h2
              id="product-material-modal-title"
              className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2"
            >
              <i className="bi bi-hammer text-blue-600" aria-hidden="true" /> Materiais de Móveis
            </h2>
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
              Gerenciar lista de materiais
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
            aria-label="Fechar modal"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="EX: MDP, MADEIRA MACIÇA..."
              className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none text-sm font-bold focus:ring-2 focus:ring-blue-500/20 uppercase dark:text-slate-200"
            />
            <button
              type="submit"
              disabled={loading || !newName.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? '...' : 'Adicionar'}
            </button>
          </form>

          <div className="space-y-2">
            {fetching ? (
              <div className="py-10 text-center animate-pulse">
                <i className="bi bi-arrow-repeat text-2xl text-slate-300" aria-hidden="true" />
              </div>
            ) : materials.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest italic leading-relaxed">
                Nenhum material cadastrado.
                <br />
                <span className="text-[8px]">Certifique-se de rodar o SQL de migração.</span>
              </div>
            ) : (
              materials.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-all"
                >
                  <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {mat.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(mat)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remover material"
                    aria-label={`Remover material ${mat.name}`}
                  >
                    <i className="bi bi-trash" aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-8 border-t border-slate-50 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
          >
            Concluir e Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ProductMaterialManagementModal;
