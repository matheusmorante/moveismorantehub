import { NcmManagementPanel } from '@/pages/App/Settings/components/fiscal/NcmManagementPanel';

export default function NcmCatalogPage() {
    return <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estoque</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">NCM</h1>
        </div>
        <NcmManagementPanel />
    </main>;
}
