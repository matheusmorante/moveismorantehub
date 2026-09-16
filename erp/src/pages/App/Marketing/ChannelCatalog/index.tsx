import React from 'react';
import { useCatalog } from './hooks/useCatalog';
import { CatalogHeader } from './components/CatalogHeader';
import { CatalogTable } from './components/CatalogTable';
import { CatalogPagination } from './components/CatalogPagination';

function ChannelCatalog() {
    const { state, actions } = useCatalog();

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
            <CatalogHeader state={state} actions={actions} />
            <CatalogTable state={state} actions={actions} />
            <CatalogPagination state={state} actions={actions} />
        </div>
    );
}

export default ChannelCatalog;
