export interface AttendanceLog {
    id?: string;
    date: string;
    salesperson_name?: string;
    customer_phone?: string;
    customer_id?: string;
    transcript: string;
    audio_url?: string;
    structured_data: {
        customer_name?: string;
        product?: string;
        closed_sale?: boolean;
        lost_reason?: string;
        positive_points?: string[];
        negative_points?: string[];
        main_objection?: string;
        sentiment?: string;
        priority?: string;
        next_step?: string;
        
        // Mantendo compatibilidade com campos anteriores se necessário
        reason?: string;
        objections?: string[];
        customer_profile?: string;
        value_estimate?: number;
        suggestions?: string[];
    };
    created_at?: string;
}
