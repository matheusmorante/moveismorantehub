import { supabase } from '@/pages/utils/supabaseConfig';
import { AttendanceLog } from "../types/attendance.type";

const TABLE_NAME = "attendance_logs";

export const attendanceService = {
    async saveLog(log: AttendanceLog) {
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .insert([{
                    date: log.date || new Date().toISOString(),
                    salesperson_name: log.salesperson_name,
                    customer_phone: log.customer_phone,
                    transcript: log.transcript,
                    audio_url: log.audio_url,
                    structured_data: log.structured_data,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) {
                console.warn("Erro ao salvar log de atendimento:", error);
                throw error;
            }
            return data?.[0];
        } catch (error) {
            console.error("Erro ao salvar log de atendimento:", error);
            throw error;
        }
    },

    async getRecentLogs(limit = 10) {
        try {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data as AttendanceLog[];
        } catch (error) {
            console.error("Erro ao buscar logs de atendimento:", error);
            return [];
        }
    },

    async uploadAudio(blob: Blob): Promise<string | null> {
        const fileName = `attendance_${Date.now()}.webm`;
        const { data, error } = await supabase.storage
            .from('attendance-audios')
            .upload(fileName, blob);

        if (error) {
            console.error("Erro ao fazer upload do áudio:", error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('attendance-audios')
            .getPublicUrl(fileName);

        return publicUrl;
    },

    async exportLogsToCSV() {
        const { data: logs, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !logs) {
            console.error("Erro ao buscar logs para exportação:", error);
            return;
        }

        const headers = ["ID", "Data", "Vendedor", "Telefone", "Transcrição", "Sentimento", "Produto", "Prioridade", "Motivo", "Próximo Passo"];
        const rows = logs.map(log => {
            const sd = log.structured_data || {};
            return [
                log.id,
                log.date,
                `"${(log.salesperson_name || '').replace(/"/g, '""')}"`,
                log.customer_phone || "",
                `"${(log.transcript || '').replace(/"/g, '""')}"`,
                sd.sentiment || "",
                sd.product || "",
                sd.priority || "",
                sd.reason || "",
                `"${(sd.next_step || "").replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `morante_bi_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
