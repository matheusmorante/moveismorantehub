import { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export function useProductOpportunities() {
    const [opportunities, setOpportunities] = useState<{ id: string; name: string }[]>([]);

    const fetchOpportunities = async () => {
        try {
            const { data } = await supabase.from('opportunities').select('id, name').eq('active', true).order('name');
            if (data) setOpportunities(data);
        } catch (err) {
            console.error('Erro ao carregar oportunidades:', err);
        }
    };

    useEffect(() => {
        fetchOpportunities();

        const onFocus = () => {
            fetchOpportunities();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, []);

    return { opportunities, fetchOpportunities };
}
