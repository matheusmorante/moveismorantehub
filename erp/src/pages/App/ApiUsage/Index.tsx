import React from 'react';
import { useApiUsageDashboard } from './hooks/useApiUsageDashboard';
import ApiUsageHeader from './components/ApiUsageHeader';
import ApiUsageTabs from './components/ApiUsageTabs';
import ApiUsageAlerts from './components/ApiUsageAlerts';
import ApiUsageGlobalMetrics from './components/ApiUsageGlobalMetrics';
import ApiUsageIntegrationsGrid from './components/ApiUsageIntegrationsGrid';
import ApiUsageLineChart from './components/ApiUsageLineChart';
import ApiModuleDistributionChart from './components/ApiModuleDistributionChart';
import ApiConfigEditModal from './components/ApiConfigEditModal';
import SupabaseMonitorDashboard from '../Settings/SupabaseMonitor/Index';

export default function ApiUsagePage() {
    const dashboard = useApiUsageDashboard();

    return (
        <div className="max-w-[1700px] mx-auto space-y-6 px-4 lg:px-8 py-6 animate-reveal">
            <ApiUsageHeader
                environment={dashboard.environment}
                setEnvironment={dashboard.setEnvironment}
                period={dashboard.period}
                setPeriod={dashboard.setPeriod}
                selectedProvider={dashboard.selectedProvider}
                setSelectedProvider={dashboard.setSelectedProvider}
                loadData={dashboard.loadData}
                loading={dashboard.loading}
            />

            <ApiUsageTabs
                viewMode={dashboard.viewMode}
                setViewMode={dashboard.setViewMode}
            />

            {dashboard.viewMode === 'supabase' ? (
                <div className="mt-4 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <SupabaseMonitorDashboard />
                </div>
            ) : (
                <>
                    <ApiUsageAlerts metrics={dashboard.metrics} />

                    <ApiUsageGlobalMetrics metrics={dashboard.metrics} />

                    <ApiUsageIntegrationsGrid
                        summaries={dashboard.filteredSummaries}
                        activeSummaryServiceId={dashboard.activeSummary?.service_id || ''}
                        onSelectService={dashboard.setSelectedServiceId}
                        onEditConfig={dashboard.setEditingConfig}
                    />

                    {/* Seção Analítica: Gráfico de Linha Diário + Distribuição por Módulo */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            {dashboard.activeSummary ? (
                                <ApiUsageLineChart
                                    daysData={dashboard.chartDays}
                                    monthlyLimit={dashboard.activeSummary.monthlyLimit}
                                    apiName={dashboard.activeSummary.service_name}
                                />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                                    Selecione uma API acima para visualizar a evolução diária.
                                </div>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            {dashboard.activeSummary ? (
                                <ApiModuleDistributionChart
                                    apiName={dashboard.activeSummary.service_name}
                                    totalCalls={dashboard.activeSummary.currentMonthUsage}
                                />
                            ) : (
                                <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                                    Dados de distribuição indisponíveis.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Modal de Edição de Configurações */}
                    {dashboard.editingConfig && (
                        <ApiConfigEditModal
                            config={dashboard.editingConfig}
                            isOpen={Boolean(dashboard.editingConfig)}
                            onClose={() => dashboard.setEditingConfig(null)}
                            onSaved={dashboard.loadData}
                        />
                    )}
                </>
            )}
        </div>
    );
}
