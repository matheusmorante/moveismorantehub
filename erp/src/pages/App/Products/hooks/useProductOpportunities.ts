import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export interface OpportunityOption {
    readonly id: string;
    readonly name: string;
}

export function useProductOpportunities() {
    const [opportunities, setOpportunities] = useState<readonly OpportunityOption[]>([]);

    const fetchOpportunities = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('opportunities')
                .select('id, name')
                .eq('active', true)
                .order('name');

            if (error) {
                console.error('Erro na consulta de oportunidades:', error);
                return;
            }
            if (data) setOpportunities(data);
        } catch (err: unknown) {
            console.error('Erro ao carregar oportunidades:', err);
        }
    }, []);

    useEffect(() => {
        fetchOpportunities();

        const onFocus = () => {
            fetchOpportunities();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchOpportunities]);

    return { opportunities, fetchOpportunities };
}

