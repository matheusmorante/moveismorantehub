import React from 'react';
import { CatalogCollectionItem } from '../types';

interface ChannelCatalogCollectionsProps {
    collections: CatalogCollectionItem[];
    selectedCollection: string;
    onSelectCollection: (key: string) => void;
}

export const ChannelCatalogCollections: React.FC<ChannelCatalogCollectionsProps> = ({
    collections,
    selectedCollection,
    onSelectCollection,
}) => {
    if (collections.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2 px-1">
            <button
                onClick={() => onSelectCollection('all')}
                className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedCollection === 'all'
                        ? 'bg-slate-800 text-white shadow-lg'
                        : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'
                }`}
            >
                Todas as Coleções
            </button>
            {collections.map(col => (
                <button
                    key={col.key}
                    onClick={() => onSelectCollection(col.key)}
                    className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedCollection === col.key
                            ? col.key.startsWith('env__')
                                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                                : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                            : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-100 dark:border-slate-800 hover:border-slate-300'
                    }`}
                >
                    {col.key.startsWith('env__') && <i className="bi bi-geo-alt-fill mr-1.5 text-[9px]" />}
                    {col.key.startsWith('type__') && <i className="bi bi-collection-fill mr-1.5 text-[9px]" />}
                    {col.label}
                </button>
            ))}
        </div>
    );
};
