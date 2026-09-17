import React from 'react';
import { ApiConfiguration, ApiServiceSummary } from '@/services/apiMonitoring/apiMonitoringTypes';
import ApiUsageIntegrationCard from './ApiUsageIntegrationCard';

interface ApiUsageIntegrationsGridProps {
    summaries: ApiServiceSummary[];
    activeSummaryServiceId: string;
    onSelectService: (serviceId: string) => void;
    onEditConfig: (config: ApiConfiguration) => void;
}

export default function ApiUsageIntegrationsGrid({
    summaries,
    activeSummaryServiceId,
    onSelectService,
    onEditConfig
}: ApiUsageIntegrationsGridProps) {
    return (
        <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
                Integrações & Cotas Mensais
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {summaries.map(summary => (
                    <ApiUsageIntegrationCard
                        key={summary.service_id}
                        summary={summary}
                        isSelected={activeSummaryServiceId === summary.service_id}
                        onSelect={() => onSelectService(summary.service_id)}
                        onEditConfig={onEditConfig}
                    />
                ))}
            </div>
        </div>
    );
}
