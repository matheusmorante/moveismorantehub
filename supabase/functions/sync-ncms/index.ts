import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NcmOfficialItem {
    Codigo: string;
    Descricao: string;
    Data_Inicio: string;
    Data_Fim: string;
    Tipo_Ato_Ini: string;
    Numero_Ato_Ini: string;
    Ano_Ato_Ini: string;
}

interface NcmOfficialResponse {
    Data_Ultima_Atualizacao_NCM: string;
    Ato: string;
    Nomenclaturas: NcmOfficialItem[];
}

// Funcao auxiliar para converter data DD/MM/YYYY para YYYY-MM-DD
function parseBrDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Authenticate service role (to bypass RLS for UPSERT)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !supabaseServiceRoleKey) {
            throw new Error('Supabase URL or Service Role Key missing.');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        // Optional: Check se quem chamou eh admin caso nao seja um CRON
        // Para simplificar no MVP e por ser Edge Function, faremos um check basico ou deixamos interno via trigger RLS protegido
        
        console.log("Fetching official NCM JSON from Siscomex...");
        const response = await fetch("https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json");
        
        if (!response.ok) {
            throw new Error(`Siscomex API returned status ${response.status}`);
        }

        const data = await response.json() as NcmOfficialResponse;
        
        if (!data.Nomenclaturas || !Array.isArray(data.Nomenclaturas)) {
            throw new Error("Invalid format received from Siscomex.");
        }

        console.log(`Received ${data.Nomenclaturas.length} raw nomenclatures.`);

        // Filter and map only 8-digit NCMs
        const validNcms = data.Nomenclaturas
            .map(n => ({ ...n, cleanCode: n.Codigo.replace(/[^0-9]/g, '') }))
            .filter(n => n.cleanCode.length === 8);

        console.log(`Found ${validNcms.length} valid 8-digit NCMs.`);

        const upsertData = validNcms.map(n => ({
            code: n.cleanCode,
            official_description: n.Descricao,
            start_date: parseBrDate(n.Data_Inicio),
            end_date: parseBrDate(n.Data_Fim),
            legal_act: `${n.Tipo_Ato_Ini} ${n.Numero_Ato_Ini}/${n.Ano_Ato_Ini}`,
            active: true,
            updated_at: new Date().toISOString()
        }));

        // Fetch existing active NCMs to check for deletions/inactivations
        const { data: existingActive, error: fetchError } = await supabase
            .from('ncms')
            .select('code')
            .eq('active', true);

        if (fetchError) {
            console.error("Error fetching existing active NCMs:", fetchError);
            throw fetchError;
        }

        const existingCodes = new Set(existingActive?.map(e => e.code) || []);
        const newCodes = new Set(upsertData.map(u => u.code));

        const codesToInactivate = [...existingCodes].filter(code => !newCodes.has(code));

        console.log(`Will upsert ${upsertData.length} records. Will inactivate ${codesToInactivate.length} obsolete NCMs.`);

        // Upsert in batches of 1000 to avoid payload size limits
        const batchSize = 1000;
        let upsertedCount = 0;
        for (let i = 0; i < upsertData.length; i += batchSize) {
            const batch = upsertData.slice(i, i + batchSize);
            const { error: upsertError } = await supabase
                .from('ncms')
                .upsert(batch, { onConflict: 'code' });
            
            if (upsertError) {
                console.error(`Error upserting batch ${i}:`, upsertError);
                throw upsertError;
            }
            upsertedCount += batch.length;
        }

        // Inactivate obsolete codes (also in batches)
        let inactivatedCount = 0;
        if (codesToInactivate.length > 0) {
            for (let i = 0; i < codesToInactivate.length; i += batchSize) {
                const batch = codesToInactivate.slice(i, i + batchSize);
                const { error: inactivateError } = await supabase
                    .from('ncms')
                    .update({ active: false, updated_at: new Date().toISOString() })
                    .in('code', batch);

                if (inactivateError) {
                    console.error(`Error inactivating batch ${i}:`, inactivateError);
                    throw inactivateError;
                }
                inactivatedCount += batch.length;
            }
        }

        return new Response(JSON.stringify({ 
            success: true, 
            message: "Sync complete", 
            upserted: upsertedCount,
            inactivated: inactivatedCount,
            last_official_update: data.Data_Ultima_Atualizacao_NCM
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Error in sync-ncms function:", error.message);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
